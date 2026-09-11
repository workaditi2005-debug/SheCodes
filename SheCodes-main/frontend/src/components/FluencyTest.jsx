import { useState, useEffect, useRef } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Badge } from "./RiskDashboard";
import { useAssessment } from "../context/AssessmentContext";

export default function FluencyTest({ setPage }) {
  const { setFluencyData } = useAssessment();
  const [phase, setPhase] = useState("intro"); // intro | active | result
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [timer, setTimer] = useState(30);
  const [pauses, setPauses] = useState([]); // time between each word entry
  const lastWordTime = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (phase !== "active") return;
    const iv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(iv);
          finishTest();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  function startTest() {
    setPhase("active");
    setTimer(30);
    setWords([]);
    setPauses([]);
    lastWordTime.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleKeyDown(e) {
    if (e.key === " " || e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const word = input.trim().toLowerCase();
      if (word.length > 1) {
        const now = Date.now();
        const pauseMs = lastWordTime.current ? now - lastWordTime.current : 0;
        lastWordTime.current = now;
        setWords(w => [...w, word]);
        setPauses(p => [...p, pauseMs / 1000]);
      }
      setInput("");
    }
  }

  function finishTest() {
    const finalWords = words.length > 0 ? words : [];
    // Count unique non-repeated words
    const unique = [...new Set(finalWords)];
    const repetitions = finalWords.length - unique.length;
    const avgPause = pauses.length > 1 ? pauses.slice(1).reduce((a, b) => a + b, 0) / (pauses.length - 1) : 5;

    const payload = {
      word_count: unique.length,
      repetitions,
      avg_pause_seconds: parseFloat(avgPause.toFixed(2)),
      total_words: finalWords.length,
      words: finalWords,
    };

    setFluencyData(payload);
    setPhase("result");
  }

  const uniqueWords = [...new Set(words)];
  const repeated = words.filter((w, i) => words.indexOf(w) !== i);
  const timerPercent = (timer / 30) * 100;
  const timerColor = timer > 15 ? T.green : timer > 8 ? T.amber : T.red;

  return (
    <div>
      <button onClick={() => setPage("assessments")} style={{ background: "none", border: "none", color: T.creamFaint, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, marginBottom: 24 }}>← Back</button>
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, letterSpacing: -1, marginBottom: 6 }}>Word Fluency Test</h1>
      <p style={{ color: T.creamFaint, fontSize: 14, marginBottom: 32 }}>Type as many animals as you can in 30 seconds. Press Space or Enter after each word.</p>

      {phase === "intro" && (
        <DarkCard style={{ padding: 40, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🦁</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: T.cream, marginBottom: 12 }}>Animal Fluency Test</div>
          <p style={{ color: T.creamFaint, fontSize: 14, lineHeight: 1.75, maxWidth: 400, margin: "0 auto 28px" }}>
            When you press Start, type as many <strong style={{ color: T.cream }}>animals</strong> as you can think of.
            Press <kbd style={{ background: T.bg3, padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>Space</kbd> or{" "}
            <kbd style={{ background: T.bg3, padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>Enter</kbd> after each word.
            You have 30 seconds.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
            {["🐕 dog", "🐈 cat", "🐘 elephant", "🦅 eagle"].map(ex => (
              <span key={ex} style={{ padding: "6px 14px", borderRadius: 20, background: T.bg3, color: T.creamDim, fontSize: 13, border: `1px solid ${T.cardBorder}` }}>{ex}</span>
            ))}
          </div>
          <Btn onClick={startTest}>Start 30-Second Test →</Btn>
        </DarkCard>
      )}

      {phase === "active" && (
        <div>
          {/* Timer */}
          <DarkCard style={{ padding: 24, marginBottom: 20 }} hover={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ color: T.creamFaint, fontSize: 13, fontWeight: 600 }}>Time Remaining</span>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, color: timerColor }}>{timer}s</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${timerPercent}%`, background: timerColor, borderRadius: 3, transition: "width 1s linear, background 0.5s" }} />
            </div>
          </DarkCard>

          {/* Input */}
          <DarkCard style={{ padding: 24, marginBottom: 20 }} hover={false}>
            <div style={{ fontSize: 13, color: T.creamFaint, marginBottom: 10 }}>Type an animal and press Space or Enter:</div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. lion..."
              style={{
                width: "100%", padding: "14px 18px", borderRadius: 12,
                background: T.bg2, border: `1px solid ${T.cardBorder}`,
                color: T.cream, fontSize: 18, outline: "none",
                fontFamily: "'DM Sans',sans-serif",
              }}
              autoComplete="off"
            />
          </DarkCard>

          {/* Word cloud */}
          <DarkCard style={{ padding: 24, minHeight: 100 }} hover={false}>
            <div style={{ fontSize: 13, color: T.creamFaint, marginBottom: 12 }}>
              Words entered: <strong style={{ color: T.cream }}>{uniqueWords.length}</strong>
              {repeated.length > 0 && <span style={{ color: T.amber, marginLeft: 12 }}>⚠ {repeated.length} repeated</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {words.map((w, i) => {
                const isRepeat = words.slice(0, i).includes(w);
                return (
                  <span key={i} style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                    background: isRepeat ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                    color: isRepeat ? T.amber : T.green,
                    border: `1px solid ${isRepeat ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.25)"}`,
                  }}>{w}</span>
                );
              })}
            </div>
          </DarkCard>
        </div>
      )}

      {phase === "result" && (
        <DarkCard style={{ padding: 40, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: T.cream, marginBottom: 20 }}>Test Complete</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Unique Animals", value: uniqueWords.length, color: T.green },
              { label: "Repetitions", value: repeated.length, color: repeated.length > 2 ? T.amber : T.creamFaint },
              { label: "Score", value: `${Math.min(100, uniqueWords.length * 5)}/100`, color: T.blue },
            ].map(m => (
              <div key={m.label} style={{ background: T.bg3, borderRadius: 12, padding: 20 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, color: m.color, marginBottom: 4 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: T.creamFaint, textTransform: "uppercase", letterSpacing: 0.8 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 28 }}>
            {uniqueWords.map(w => (
              <span key={w} style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(34,197,94,0.1)", color: T.green, fontSize: 12, border: "1px solid rgba(34,197,94,0.2)" }}>{w}</span>
            ))}
          </div>

          <div style={{ color: T.creamFaint, fontSize: 13, lineHeight: 1.65, maxWidth: 420, margin: "0 auto 28px", padding: "14px 18px", background: T.bg3, borderRadius: 12 }}>
            Naming 14+ animals in 30 seconds is typically in the normal range for adults. This test reflects verbal fluency and semantic memory retrieval.
          </div>

          <Btn onClick={() => setPage("assessments")}>← Back to Assessments</Btn>
        </DarkCard>
      )}
    </div>
  );
}
