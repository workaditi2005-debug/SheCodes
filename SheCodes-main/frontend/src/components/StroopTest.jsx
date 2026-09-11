/**
 * StroopTest — Executive Function
 * Show a color word printed in a DIFFERENT ink color.
 * User must click the INK COLOR, not the word.
 * 12 trials: 4 congruent (warm-up) + 8 incongruent (scored).
 */
import { useState, useRef, useEffect } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn } from "./RiskDashboard";
import { useAssessment } from "../context/AssessmentContext";

const COLORS = [
  { name: "RED",    hex: "#e84040" },
  { name: "GREEN",  hex: "#4ade80" },
  { name: "BLUE",   hex: "#60a5fa" },
  { name: "YELLOW", hex: "#f59e0b" },
];

function makeTrial(congruent) {
  const word  = COLORS[Math.floor(Math.random() * COLORS.length)];
  let   ink   = word;
  if (!congruent) {
    const others = COLORS.filter(c => c.name !== word.name);
    ink = others[Math.floor(Math.random() * others.length)];
  }
  return { word: word.name, inkColor: ink.hex, inkName: ink.name, congruent };
}

function buildTrials() {
  const warm = Array.from({ length: 4 }, () => makeTrial(true));
  const test = Array.from({ length: 8 }, () => makeTrial(false));
  return [...warm, ...test];
}

export default function StroopTest({ setPage }) {
  const { setStroopData } = useAssessment();
  const [phase, setPhase]       = useState("intro");   // intro | trial | result
  const [trials]                = useState(buildTrials);
  const [idx, setIdx]           = useState(0);
  const [results, setResults]   = useState([]);
  const trialStart              = useRef(null);

  const trial = trials[idx];

  function startTest() { setPhase("trial"); trialStart.current = Date.now(); }

  function handleChoice(colorName) {
    const rt      = Date.now() - trialStart.current;
    const correct = colorName === trial.inkName;
    const newRes  = [...results, { ...trial, chosen: colorName, correct, rt }];
    setResults(newRes);

    if (idx + 1 >= trials.length) {
      // Only score incongruent trials
      const incongruent = newRes.filter(r => !r.congruent);
      const errors      = incongruent.filter(r => !r.correct).length;
      const rts         = incongruent.map(r => r.rt);
      const meanRt      = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 600;

      setStroopData({
        total_trials:    incongruent.length,
        error_count:     errors,
        mean_rt:         Math.round(meanRt),
        incongruent_rt:  Math.round(meanRt),
      });
      setPhase("result");
    } else {
      setIdx(i => i + 1);
      trialStart.current = Date.now();
    }
  }

  const incongruent = results.filter(r => !r.congruent);
  const errors      = incongruent.filter(r => !r.correct).length;
  const accuracy    = incongruent.length > 0 ? Math.round(((incongruent.length - errors) / incongruent.length) * 100) : 100;
  const avgRt       = incongruent.length > 0 ? Math.round(incongruent.reduce((a, r) => a + r.rt, 0) / incongruent.length) : 0;

  return (
    <div>
      <button onClick={() => setPage("assessments")} style={{ background: "none", border: "none", color: T.creamFaint, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, marginBottom: 24 }}>← Back</button>
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, letterSpacing: -1, marginBottom: 6 }}>Stroop Test</h1>
      <p style={{ color: T.creamFaint, fontSize: 14, marginBottom: 32 }}>Click the <strong style={{ color: T.cream }}>color of the ink</strong>, not what the word says. Executive function test.</p>

      {phase === "intro" && (
        <DarkCard style={{ padding: 40, maxWidth: 520, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🧠</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: T.cream, marginBottom: 16 }}>How it works</div>
          <p style={{ color: T.creamFaint, lineHeight: 1.8, marginBottom: 12 }}>
            You will see a color word (e.g. <strong style={{ color: "#e84040" }}>RED</strong>) printed in a <em>different</em> ink color.
          </p>
          <p style={{ color: T.creamFaint, lineHeight: 1.8, marginBottom: 28 }}>
            Your job is to click the <strong style={{ color: T.cream }}>ink color</strong>, ignoring what the word says. 12 trials total.
          </p>
          <Btn onClick={startTest}>Start Test →</Btn>
        </DarkCard>
      )}

      {phase === "trial" && trial && (
        <DarkCard style={{ padding: 48, maxWidth: 560, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 11, color: T.creamFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 32 }}>
            Trial {idx + 1} of {trials.length}
            {idx >= 4 && <span style={{ color: T.amber, marginLeft: 8 }}>• Scored</span>}
          </div>

          {/* The Stroop stimulus */}
          <div style={{
            fontFamily: "'Instrument Serif',serif",
            fontSize: 72,
            fontWeight: 700,
            color: trial.inkColor,
            letterSpacing: 4,
            marginBottom: 48,
            textShadow: `0 0 30px ${trial.inkColor}44`,
            userSelect: "none",
          }}>
            {trial.word}
          </div>

          {/* Color choice buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {COLORS.map(c => (
              <button key={c.name} onClick={() => handleChoice(c.name)} style={{
                padding: "16px 24px",
                borderRadius: 14,
                border: `2px solid ${c.hex}44`,
                background: `${c.hex}12`,
                color: c.hex,
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                transition: "all 0.15s",
                letterSpacing: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${c.hex}25`; e.currentTarget.style.borderColor = c.hex; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${c.hex}12`; e.currentTarget.style.borderColor = `${c.hex}44`; }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </DarkCard>
      )}

      {phase === "result" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <DarkCard style={{ padding: 36 }} hover={false}>
            <div style={{ fontSize: 11, color: T.creamFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 24 }}>Stroop Results</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Accuracy",      v: `${accuracy}%`,     c: accuracy >= 80 ? T.green : accuracy >= 60 ? T.amber : T.red },
                { label: "Avg RT",        v: `${avgRt}ms`,       c: avgRt < 600 ? T.green : T.amber },
                { label: "Errors",        v: errors,              c: errors === 0 ? T.green : errors <= 2 ? T.amber : T.red },
                { label: "Trials Scored", v: incongruent.length,  c: T.cream },
              ].map(m => (
                <div key={m.label} style={{ background: T.bg3, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: T.creamFaint, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontWeight: 700, color: m.c, fontSize: 24 }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(74,222,128,0.08)", borderRadius: 14, padding: 18, border: "1px solid rgba(74,222,128,0.15)" }}>
              <div style={{ color: T.green, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>✓ Executive data captured</div>
              <div style={{ color: T.creamFaint, fontSize: 13, lineHeight: 1.65 }}>Stroop interference measures inhibitory control and executive function.</div>
            </div>
          </DarkCard>
          <DarkCard style={{ padding: 28 }} hover={false}>
            <div style={{ fontSize: 11, color: T.creamFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>Trial Log</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
              {incongruent.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bg3, borderRadius: 8, padding: "8px 14px" }}>
                  <span style={{ color: r.inkColor, fontWeight: 700, fontSize: 13 }}>{r.word}</span>
                  <span style={{ color: T.creamFaint, fontSize: 11 }}>ink: {r.inkName}</span>
                  <span style={{ color: r.correct ? T.green : T.red, fontWeight: 700, fontSize: 12 }}>{r.correct ? "✓" : "✗"} {r.rt}ms</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn onClick={() => setPage("assessments")} style={{ width: "100%", justifyContent: "center" }}>← Back to Tests</Btn>
            </div>
          </DarkCard>
        </div>
      )}
    </div>
  );
}
