import { useState, useEffect } from "react";
import { T } from "../utils/theme";
import { getToken } from "../services/api";

const LIME = "#C8F135";

async function api(method, path, body) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || "Request failed");
  }
  return res.json();
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, ...style }}>
      {children}
    </div>
  );
}

function Tag({ label, onDelete }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:`${LIME}15`, border:`1px solid ${LIME}33`, color:LIME, fontSize:13, fontWeight:600 }}>
      {label}
      {onDelete && <button onClick={onDelete} style={{ background:"none", border:"none", color:"#999", cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>×</button>}
    </span>
  );
}

export default function ContentManager() {
  const [tab,      setTab]      = useState("passages");
  const [content,  setContent]  = useState({ passages: [], word_sets: [] });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  // Passage form
  const [pText,    setPText]    = useState("");
  const [pSaving,  setPSaving]  = useState(false);

  // Word set form
  const [wordInput, setWordInput] = useState("");
  const [wordList,  setWordList]  = useState([]);
  const [wSaving,   setWSaving]   = useState(false);

  useEffect(() => { loadContent(); }, []);

  async function loadContent() {
    setLoading(true);
    try { setContent(await api("GET", "/content")); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }

  async function addPassage() {
    if (pText.trim().length < 30) return setError("Passage must be at least 30 characters.");
    setError(""); setPSaving(true);
    try {
      await api("POST", "/content/passage", { text: pText.trim() });
      setPText("");
      await loadContent();
      flash("Passage added successfully!");
    } catch(e) { setError(e.message); }
    finally { setPSaving(false); }
  }

  async function deletePassage(id) {
    try { await api("DELETE", `/content/passage/${id}`); await loadContent(); flash("Passage removed."); }
    catch(e) { setError(e.message); }
  }

  function handleWordKeyDown(e) {
    if (["Enter", ",", " "].includes(e.key)) {
      e.preventDefault();
      const w = wordInput.trim().replace(/,/g, "");
      if (w && !wordList.includes(w)) setWordList(l => [...l, w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()]);
      setWordInput("");
    }
  }

  async function addWordSet() {
    if (wordList.length < 8) return setError("Add at least 8 words.");
    setError(""); setWSaving(true);
    try {
      await api("POST", "/content/wordset", { words: wordList });
      setWordList([]); setWordInput("");
      await loadContent();
      flash("Word set added successfully!");
    } catch(e) { setError(e.message); }
    finally { setWSaving(false); }
  }

  async function deleteWordSet(id) {
    try { await api("DELETE", `/content/wordset/${id}`); await loadContent(); flash("Word set removed."); }
    catch(e) { setError(e.message); }
  }

  const TAB_STYLE = (active) => ({
    padding: "8px 20px", borderRadius: 10, border: "none",
    background: active ? `${LIME}18` : "transparent",
    color: active ? LIME : "#555",
    fontWeight: active ? 700 : 500,
    fontSize: 13, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
    borderBottom: active ? `2px solid ${LIME}` : "2px solid transparent",
  });

  return (
    <div>
      <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:34, color:"#fff", letterSpacing:-1, marginBottom:6 }}>Content Manager</h1>
      <p style={{ color:"#555", fontSize:14, marginBottom:28 }}>Add custom speech passages and memory word sets. They'll be randomly mixed with built-in content.</p>

      {/* Built-in pool info */}
      <div style={{ display:"flex", gap:12, marginBottom:24 }}>
        {[
          { label:"Built-in Passages", count:8, icon:"📝" },
          { label:"Custom Passages",   count:content.passages?.length || 0, icon:"✏️" },
          { label:"Built-in Word Sets",count:8, icon:"🧠" },
          { label:"Custom Word Sets",  count:content.word_sets?.length || 0, icon:"➕" },
        ].map(s => (
          <Card key={s.label} style={{ flex:1, padding:18 }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontWeight:900, color:"#fff", fontSize:22 }}>{s.count}</div>
            <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {error   && <div style={{ background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.3)", borderRadius:10, padding:"12px 16px", color:T.red, fontSize:13, marginBottom:16 }}>⚠️ {error}</div>}
      {success && <div style={{ background:`${LIME}12`, border:`1px solid ${LIME}33`, borderRadius:10, padding:"12px 16px", color:LIME, fontSize:13, marginBottom:16 }}>✓ {success}</div>}

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, borderBottom:"1px solid rgba(255,255,255,0.07)", marginBottom:24 }}>
        <button style={TAB_STYLE(tab==="passages")} onClick={() => setTab("passages")}>📝 Speech Passages</button>
        <button style={TAB_STYLE(tab==="wordsets")} onClick={() => setTab("wordsets")}>🧠 Memory Word Sets</button>
      </div>

      {/* ── Passages tab ── */}
      {tab === "passages" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Add form */}
          <Card>
            <div style={{ fontWeight:700, color:"#fff", fontSize:15, marginBottom:16 }}>Add New Passage</div>
            <div style={{ fontSize:12, color:"#555", marginBottom:8 }}>Write a 1–3 sentence passage (30–800 chars). Keep it natural and fluent.</div>
            <textarea
              value={pText}
              onChange={e => setPText(e.target.value)}
              placeholder="e.g. The morning light came through the window slowly, casting long shadows across the wooden floor. She sat quietly with her tea, listening to the birds outside..."
              rows={5}
              style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", fontSize:13, fontFamily:"'DM Sans',sans-serif", resize:"vertical", outline:"none", lineHeight:1.6, boxSizing:"border-box" }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
              <div style={{ fontSize:11, color: pText.length < 30 ? T.red : pText.length > 800 ? T.red : "#555" }}>
                {pText.length}/800 chars {pText.length < 30 && pText.length > 0 ? "— too short" : ""}
              </div>
              <button onClick={addPassage} disabled={pSaving || pText.length < 30}
                style={{ padding:"9px 20px", borderRadius:10, background: pText.length >= 30 ? `linear-gradient(135deg,${LIME},#9abf28)` : "rgba(255,255,255,0.05)", color: pText.length >= 30 ? "#080808" : "#555", fontWeight:700, fontSize:13, border:"none", cursor: pText.length >= 30 ? "pointer" : "default", fontFamily:"'DM Sans',sans-serif" }}>
                {pSaving ? "Saving…" : "Add Passage →"}
              </button>
            </div>
          </Card>

          {/* Existing custom passages */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontWeight:700, color:"#fff", fontSize:15 }}>Your Custom Passages ({content.passages?.length || 0})</div>
            {loading ? <div style={{ color:"#555", fontSize:13 }}>Loading…</div>
              : (content.passages || []).length === 0
                ? <div style={{ color:"#555", fontSize:13, padding:20, textAlign:"center", background:"rgba(255,255,255,0.02)", borderRadius:12 }}>No custom passages yet.<br/>Add one on the left.</div>
                : (content.passages || []).map(p => (
                  <Card key={p.id} style={{ padding:16 }}>
                    <div style={{ color:T.creamFaint, fontSize:13, lineHeight:1.7, marginBottom:10 }}>"{p.text}"</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:10, color:"#444" }}>Added by {p.added_by}</div>
                      <button onClick={() => deletePassage(p.id)} style={{ padding:"4px 10px", borderRadius:8, background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.2)", color:T.red, fontSize:11, cursor:"pointer" }}>Delete</button>
                    </div>
                  </Card>
                ))}
          </div>
        </div>
      )}

      {/* ── Word sets tab ── */}
      {tab === "wordsets" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Add form */}
          <Card>
            <div style={{ fontWeight:700, color:"#fff", fontSize:15, marginBottom:8 }}>Add New Word Set</div>
            <div style={{ fontSize:12, color:"#555", marginBottom:16 }}>Type words and press <kbd style={{ background:"rgba(255,255,255,0.1)", borderRadius:4, padding:"1px 5px" }}>Enter</kbd> or <kbd style={{ background:"rgba(255,255,255,0.1)", borderRadius:4, padding:"1px 5px" }}>,</kbd> to add. Min 8, max 20 words.</div>
            
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, minHeight:48, padding:"10px 12px", borderRadius:12, border:`1px solid ${wordList.length >= 8 ? LIME+"44" : "rgba(255,255,255,0.1)"}`, background:"rgba(255,255,255,0.04)", marginBottom:12 }}>
              {wordList.map(w => <Tag key={w} label={w} onDelete={() => setWordList(l => l.filter(x => x !== w))} />)}
              <input
                value={wordInput}
                onChange={e => setWordInput(e.target.value)}
                onKeyDown={handleWordKeyDown}
                placeholder={wordList.length === 0 ? "Type a word and press Enter…" : "Add more…"}
                style={{ border:"none", background:"transparent", color:"#fff", fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif", minWidth:120 }}
              />
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color: wordList.length < 8 ? "#555" : LIME }}>
                {wordList.length}/20 words {wordList.length > 0 && wordList.length < 8 ? `— need ${8 - wordList.length} more` : wordList.length >= 8 ? "— ready!" : ""}
              </div>
              <button onClick={addWordSet} disabled={wSaving || wordList.length < 8}
                style={{ padding:"9px 20px", borderRadius:10, background: wordList.length >= 8 ? `linear-gradient(135deg,${LIME},#9abf28)` : "rgba(255,255,255,0.05)", color: wordList.length >= 8 ? "#080808" : "#555", fontWeight:700, fontSize:13, border:"none", cursor: wordList.length >= 8 ? "pointer" : "default", fontFamily:"'DM Sans',sans-serif" }}>
                {wSaving ? "Saving…" : "Add Word Set →"}
              </button>
            </div>
          </Card>

          {/* Existing word sets */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontWeight:700, color:"#fff", fontSize:15 }}>Your Custom Word Sets ({content.word_sets?.length || 0})</div>
            {loading ? <div style={{ color:"#555", fontSize:13 }}>Loading…</div>
              : (content.word_sets || []).length === 0
                ? <div style={{ color:"#555", fontSize:13, padding:20, textAlign:"center", background:"rgba(255,255,255,0.02)", borderRadius:12 }}>No custom word sets yet.<br/>Add one on the left.</div>
                : (content.word_sets || []).map(ws => (
                  <Card key={ws.id} style={{ padding:16 }}>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                      {ws.words.map(w => <Tag key={w} label={w} />)}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:10, color:"#444" }}>{ws.words.length} words · Added by {ws.added_by}</div>
                      <button onClick={() => deleteWordSet(ws.id)} style={{ padding:"4px 10px", borderRadius:8, background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.2)", color:T.red, fontSize:11, cursor:"pointer" }}>Delete</button>
                    </div>
                  </Card>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}