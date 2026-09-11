import { useState, useEffect, useRef } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Badge } from "./RiskDashboard";
import { useAssessment } from "../context/AssessmentContext";
import { getToken } from "../services/api";

// ── 8 built-in word pools (10 targets + 6 distractors each) ─────────────────
const BUILTIN_POOLS = [
  { targets: ["River","Apple","Clock","Bridge","Music","Cloud","Forest","Candle","Mirror","Stone"],
    distractors: ["Glass","Lantern","Copper","Flame","Arrow","Desert"] },
  { targets: ["Anchor","Feather","Garden","Hammer","Island","Jacket","Kitten","Lemon","Marble","Needle"],
    distractors: ["Oyster","Pillow","Quartz","Ribbon","Saddle","Tulip"] },
  { targets: ["Cabin","Dolphin","Ember","Falcon","Glacier","Harbor","Iris","Jungle","Kettle","Lantern"],
    distractors: ["Mango","Noodle","Orchid","Pebble","Quiver","Raven"] },
  { targets: ["Amber","Basket","Crimson","Dagger","Eclipse","Fable","Goblet","Hollow","Ivory","Jasper"],
    distractors: ["Kelp","Lotus","Mystic","Noble","Onyx","Pearl"] },
  { targets: ["Acorn","Blizzard","Cavern","Dewdrop","Erosion","Fjord","Grotto","Heron","Inlet","Jewel"],
    distractors: ["Kindle","Lagoon","Mosaic","Nebula","Oasis","Prism"] },
  { targets: ["Atlas","Beacon","Cipher","Dome","Epoch","Fern","Glyph","Haven","Index","Junction"],
    distractors: ["Knoll","Ledge","Marsh","Nomad","Orbit","Parish"] },
  { targets: ["Bison","Cobalt","Drizzle","Envoy","Flint","Grove","Hearth","Icon","Joust","Knave"],
    distractors: ["Lapis","Manor","Notch","Otter","Plume","Quest"] },
  { targets: ["Abyss","Bronze","Crest","Drift","Enamel","Frond","Gulch","Haze","Imprint","Jinx"],
    distractors: ["Keel","Lore","Mirth","Niche","Omen","Pivot"] },
];

function pickPool(customPools) {
  // Merge built-in + custom, pick one at random
  const all = [...BUILTIN_POOLS, ...customPools];
  return all[Math.floor(Math.random() * all.length)];
}

export default function MemoryTest({ setPage }) {
  const { setMemoryData } = useAssessment();
  const [pool,     setPool]     = useState(null);   // { targets, distractors }
  const [allWords, setAllWords] = useState([]);
  const [phase,    setPhase]    = useState("loading"); // loading|study|distract|recall|result
  const [selected, setSelected] = useState([]);
  const [timer,    setTimer]    = useState(30);

  const firstClickRef   = useRef(null);
  const recallStartRef  = useRef(null);

  // Load content (custom pools from backend) then pick a pool
  useEffect(() => {
    async function init() {
      let customPools = [];
      try {
        const token = getToken();
        if (token) {
          const res = await fetch("/api/content", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            customPools = (data.word_sets || []).map(ws => ({
              targets:     ws.words.slice(0, 10),
              distractors: ws.words.slice(10, 16),
            }));
          }
        }
      } catch(e) {}
      const chosen = pickPool(customPools);
      const shuffled = [...chosen.targets, ...chosen.distractors].sort(() => Math.random() - 0.5);
      setPool(chosen);
      setAllWords(shuffled);
      setPhase("study");
    }
    init();
  }, []);

  // Study countdown
  useEffect(() => {
    if (phase !== "study") return;
    if (timer <= 0) { setPhase("distract"); return; }
    const iv = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(iv);
  }, [phase, timer]);

  // Distraction phase countdown
  useEffect(() => {
    if (phase !== "distract") return;
    const iv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(iv); setPhase("recall"); recallStartRef.current = Date.now(); return 0; }
        return t - 1;
      });
    }, 1000);
    setTimer(20);
    return () => clearInterval(iv);
  }, [phase]);

  function toggleWord(w) {
    if (phase !== "recall") return;
    if (!firstClickRef.current) firstClickRef.current = Date.now();
    setSelected(s => s.includes(w) ? s.filter(x => x !== w) : [...s, w]);
  }

  function submitRecall() {
    const latency = recallStartRef.current
      ? ((firstClickRef.current || Date.now()) - recallStartRef.current) / 1000
      : 3.0;
    const correctSet     = new Set(pool.targets);
    const hits           = selected.filter(w => correctSet.has(w));
    const intrusions     = selected.filter(w => !correctSet.has(w));
    const recalledTarget = selected.filter(w => correctSet.has(w));
    let orderMatches = 0;
    for (let i = 0; i < recalledTarget.length - 1; i++) {
      if (pool.targets.indexOf(recalledTarget[i]) < pool.targets.indexOf(recalledTarget[i + 1])) orderMatches++;
    }
    const orderRatio = recalledTarget.length > 1 ? orderMatches / (recalledTarget.length - 1) : 1.0;
    setMemoryData({
      word_recall_accuracy:    (hits.length / pool.targets.length) * 100,
      pattern_accuracy:        (hits.length / pool.targets.length) * 100,
      delayed_recall_accuracy: Math.max(0, (hits.length / pool.targets.length) * 100 - 5),
      recall_latency_seconds:  latency,
      order_match_ratio:       orderRatio,
      intrusion_count:         intrusions.length,
    });
    setPhase("result");
  }

  const LIME = "#C8F135";
  if (!pool || phase === "loading") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", color:"#555", fontSize:14 }}>
      Loading test content…
    </div>
  );

  return (
    <div>
      <button onClick={() => setPage("assessments")} style={{ background:"none", border:"none", color:T.creamFaint, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13, marginBottom:24 }}>← Back</button>
      <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:36, color:T.cream, letterSpacing:-1, marginBottom:6 }}>Memory Test</h1>
      <p style={{ color:T.creamFaint, fontSize:14, marginBottom:32 }}>Memorise the words, then recall them after a short distraction task.</p>

      {phase === "study" && (
        <DarkCard style={{ padding:32 }} hover={false}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <div style={{ fontSize:11, color:T.creamFaint, textTransform:"uppercase", letterSpacing:1 }}>Study these {pool.targets.length} words</div>
            <div style={{ fontWeight:900, color:timer <= 10 ? T.red : LIME, fontSize:28 }}>{timer}s</div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
            {pool.targets.map((w,i) => (
              <div key={w} style={{ background:`${LIME}12`, border:`1px solid ${LIME}33`, borderRadius:10, padding:"10px 18px", color:LIME, fontWeight:700, fontSize:15, animation:`fadeIn 0.3s ${i*0.08}s both` }}>{w}</div>
            ))}
          </div>
          <div style={{ marginTop:20, color:T.creamFaint, fontSize:12 }}>Memorise them — they will disappear in {timer} seconds.</div>
        </DarkCard>
      )}

      {phase === "distract" && (
        <DarkCard style={{ padding:32, textAlign:"center" }} hover={false}>
          <div style={{ fontSize:48, marginBottom:16 }}>🧮</div>
          <h2 style={{ color:T.cream, fontFamily:"'Instrument Serif',serif", fontSize:28, marginBottom:12 }}>Distraction Task</h2>
          <p style={{ color:T.creamFaint, fontSize:14, marginBottom:24 }}>Count backwards from 100 by 7s. This clears short-term memory.</p>
          <div style={{ fontWeight:900, color:T.red, fontSize:52, letterSpacing:2 }}>{timer}</div>
          <p style={{ color:"#555", fontSize:12, marginTop:12 }}>Recall phase begins when timer ends.</p>
        </DarkCard>
      )}

      {phase === "recall" && (
        <DarkCard style={{ padding:32 }} hover={false}>
          <div style={{ fontSize:11, color:T.creamFaint, textTransform:"uppercase", letterSpacing:1, marginBottom:20 }}>
            Select all words you remember ({selected.length} selected)
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:24 }}>
            {allWords.map(w => {
              const sel = selected.includes(w);
              return (
                <button key={w} onClick={() => toggleWord(w)} style={{ padding:"10px 18px", borderRadius:10, border:`1px solid ${sel ? LIME : "rgba(255,255,255,0.12)"}`, background: sel ? `${LIME}18` : "rgba(255,255,255,0.04)", color: sel ? LIME : T.creamFaint, fontWeight: sel ? 700 : 400, fontSize:14, cursor:"pointer", transition:"all 0.15s" }}>
                  {w}
                </button>
              );
            })}
          </div>
          <Btn onClick={submitRecall}>Submit Recall →</Btn>
        </DarkCard>
      )}

      {phase === "result" && (
        <DarkCard style={{ padding:32 }} hover={false}>
          <div style={{ fontSize:11, color:T.creamFaint, textTransform:"uppercase", letterSpacing:1, marginBottom:20 }}>Results</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:24 }}>
            {pool.targets.map(w => {
              const hit = selected.includes(w);
              return <div key={w} style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${hit ? LIME+"44" : T.red+"44"}`, background: hit ? `${LIME}12` : "rgba(232,64,64,0.08)", color: hit ? LIME : T.red, fontSize:13, fontWeight:600 }}>{hit ? "✓" : "✗"} {w}</div>;
            })}
          </div>
          <div style={{ background:"rgba(74,222,128,0.08)", borderRadius:14, padding:18, border:"1px solid rgba(74,222,128,0.15)", marginBottom:16 }}>
            <div style={{ color:LIME, fontWeight:700, fontSize:13, marginBottom:4 }}>✓ Memory data captured</div>
            <div style={{ color:T.creamFaint, fontSize:13 }}>{selected.filter(w => pool.targets.includes(w)).length} / {pool.targets.length} words recalled correctly.</div>
          </div>
          <Btn onClick={() => setPage("assessments")}>← Back to Tests</Btn>
        </DarkCard>
      )}
    </div>
  );
}