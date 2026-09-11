import { useState, useRef, useCallback } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn } from "./RiskDashboard";
import { useAssessment } from "../context/AssessmentContext";

const ROUNDS     = 7;
const TIMEOUT_MS = 3000;
const LIME       = "#C8F135";

const mean   = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const stdDev = (arr, avg) => arr.length > 1
  ? Math.sqrt(arr.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / arr.length)
  : 0;

export default function ReactionTest({ setPage }) {
  const { setReactionData } = useAssessment();

  const [phase,  setPhase]  = useState("idle");  // idle | waiting | go | done
  const [times,  setTimes]  = useState([]);
  const [misses, setMisses] = useState(0);
  const [t0,     setT0]     = useState(null);

  // Use refs to avoid stale closures inside setTimeout
  const timesRef   = useRef([]);
  const missesRef  = useRef(0);
  const phaseRef   = useRef("idle");
  const t0Ref      = useRef(null);
  const waitTimer  = useRef(null);
  const missTimer  = useRef(null);

  function clearAllTimers() {
    clearTimeout(waitTimer.current);
    clearTimeout(missTimer.current);
  }

  function finishTest(finalTimes, finalMisses) {
    clearAllTimers();
    phaseRef.current = "done";
    setPhase("done");

    if (!finalTimes.length) return;

    setReactionData({
      times:      finalTimes,
      miss_count: finalMisses,
      initiation_delay: finalTimes[0] ?? null,
    });
  }

  function startRound() {
    setPhase("waiting");
    phaseRef.current = "waiting";

    const delay = 1500 + Math.random() * 2500;
    waitTimer.current = setTimeout(() => {
      const now = Date.now();
      t0Ref.current = now;
      setT0(now);
      phaseRef.current = "go";
      setPhase("go");

      // Auto-miss if no click within TIMEOUT_MS
      missTimer.current = setTimeout(() => {
        const newMisses = missesRef.current + 1;
        missesRef.current = newMisses;
        setMisses(newMisses);

        const currentTotal = timesRef.current.length + newMisses;
        if (currentTotal >= ROUNDS) {
          finishTest(timesRef.current, newMisses);
        } else {
          startRound();
        }
      }, TIMEOUT_MS);
    }, delay);
  }

  function handleBoxClick() {
    if (phaseRef.current === "go") {
      clearTimeout(missTimer.current);
      const rt   = Date.now() - t0Ref.current;
      const next = [...timesRef.current, rt];
      timesRef.current = next;
      setTimes([...next]);

      const total = next.length + missesRef.current;
      if (total >= ROUNDS) {
        finishTest(next, missesRef.current);
      } else {
        startRound();
      }
    } else if (phaseRef.current === "waiting") {
      // False start — penalise by restarting round
      clearTimeout(waitTimer.current);
      startRound();
    } else if (phaseRef.current === "idle") {
      // Begin test
      timesRef.current  = [];
      missesRef.current = 0;
      setTimes([]);
      setMisses(0);
      startRound();
    }
  }

  function restart() {
    clearAllTimers();
    timesRef.current  = [];
    missesRef.current = 0;
    phaseRef.current  = "idle";
    setTimes([]);
    setMisses(0);
    setPhase("idle");
  }

  // Derived stats for results panel
  const avg   = Math.round(mean(times));
  const vr    = Math.round(stdDev(times, mean(times)));
  const drift = times.length >= 4
    ? Math.round(mean(times.slice(Math.floor(times.length / 2))) - mean(times.slice(0, Math.floor(times.length / 2))))
    : 0;

  const bgColor   = phase === "go" ? "rgba(74,222,128,0.18)" : phase === "waiting" ? "rgba(232,64,64,0.06)" : "rgba(255,255,255,0.03)";
  const borderCol = phase === "go" ? T.green : phase === "waiting" ? "rgba(232,64,64,0.3)" : T.cardBorder;
  const glow      = phase === "go" ? "0 0 50px rgba(74,222,128,0.35)" : "none";

  const roundsDone = times.length + misses;

  return (
    <div>
      <button onClick={() => { clearAllTimers(); setPage("assessments"); }}
        style={{ background: "none", border: "none", color: T.creamFaint, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, marginBottom: 24 }}>← Back</button>

      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, letterSpacing: -1, marginBottom: 6 }}>Reaction Time Test</h1>
      <p style={{ color: T.creamFaint, fontSize: 14, marginBottom: 32 }}>
        Click the box the moment it turns <span style={{ color: T.green, fontWeight: 700 }}>green</span>. {ROUNDS} rounds — measures speed, variability, drift, and attention.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* ── Click zone ── */}
        <div>
          <div
            onClick={phase !== "done" ? handleBoxClick : undefined}
            style={{
              height: 300, borderRadius: 20,
              background: bgColor,
              border: `2px solid ${borderCol}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
              cursor: phase === "done" ? "default" : "pointer",
              transition: "background 0.08s, border-color 0.08s, box-shadow 0.08s",
              userSelect: "none",
              boxShadow: glow,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 14, lineHeight: 1 }}>
              {phase === "idle"    && "👆"}
              {phase === "waiting" && "⏳"}
              {phase === "go"      && "🟢"}
              {phase === "done"    && "✅"}
            </div>
            <div style={{ fontWeight: 900, fontSize: 22, color: phase === "go" ? T.green : T.cream, letterSpacing: -0.5 }}>
              {phase === "idle"    && "Tap to Start"}
              {phase === "waiting" && "Wait…"}
              {phase === "go"      && "CLICK NOW!"}
              {phase === "done"    && "Test Complete!"}
            </div>
            {phase !== "idle" && phase !== "done" && (
              <div style={{ color: T.creamFaint, fontSize: 13, marginTop: 10 }}>
                Round {roundsDone + 1} / {ROUNDS}
              </div>
            )}
            {phase === "waiting" && (
              <div style={{ color: "#555", fontSize: 12, marginTop: 6 }}>Don't click yet!</div>
            )}
          </div>

          {/* Progress pills */}
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {times.map((t, i) => (
              <div key={`t-${i}`} style={{ background: `${T.green}15`, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "5px 12px", fontWeight: 700, color: T.green, fontSize: 12 }}>
                {t}ms
              </div>
            ))}
            {misses > 0 && (
              <div style={{ background: "rgba(232,64,64,0.1)", border: "1px solid rgba(232,64,64,0.3)", borderRadius: 8, padding: "5px 12px", color: T.red, fontSize: 12, fontWeight: 700 }}>
                ✗ {misses} miss{misses > 1 ? "es" : ""}
              </div>
            )}
          </div>

          {phase === "done" && (
            <button onClick={restart} style={{ marginTop: 12, background: "transparent", border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "8px 18px", color: T.creamFaint, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              ↺ Retake
            </button>
          )}
        </div>

        {/* ── Results panel ── */}
        <DarkCard style={{ padding: 28 }} hover={false}>
          <div style={{ fontSize: 11, color: T.creamFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 20 }}>Live Results</div>

          {phase === "done" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Avg. Reaction",  v: `${avg}ms`,           c: avg < 300 ? T.green : avg < 450 ? T.amber : T.red  },
                  { label: "Variability",    v: `±${vr}ms`,           c: vr  < 50  ? T.green : T.amber                       },
                  { label: "Fastest RT",     v: times.length ? `${Math.min(...times)}ms` : "—", c: T.green },
                  { label: "Fatigue Drift",  v: `${drift > 0 ? "+" : ""}${drift}ms`, c: Math.abs(drift) < 30 ? T.green : T.amber },
                  { label: "Misses",         v: misses,               c: misses === 0 ? T.green : T.red                      },
                  { label: "Attn. Index",    v: avg > 0 ? (vr / avg).toFixed(3) : "—", c: T.cream },
                ].map(m => (
                  <div key={m.label} style={{ background: T.bg3, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, color: T.creamFaint, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{m.label}</div>
                    <div style={{ fontWeight: 700, color: m.c, fontSize: 20 }}>{m.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(74,222,128,0.08)", borderRadius: 14, padding: 18, border: "1px solid rgba(74,222,128,0.15)", marginBottom: 16 }}>
                <div style={{ color: T.green, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>✓ Reaction data captured</div>
                <div style={{ color: T.creamFaint, fontSize: 13, lineHeight: 1.65 }}>
                  {times.length} reaction times recorded · {misses} miss{misses !== 1 ? "es" : ""}
                </div>
              </div>
              <Btn onClick={() => setPage("assessments")} style={{ width: "100%", justifyContent: "center" }}>← Back to Tests</Btn>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0", color: T.creamFaint }}>
              {/* Live bar showing progress */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
                {Array.from({ length: ROUNDS }).map((_, i) => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: i < times.length ? T.green
                      : i < times.length + misses ? T.red
                      : "rgba(255,255,255,0.1)",
                    transition: "background 0.3s",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                {roundsDone}/{ROUNDS} rounds done
              </div>
              {times.length > 0 && (
                <div style={{ fontSize: 28, fontWeight: 900, color: LIME, marginTop: 16 }}>{avg}ms avg</div>
              )}
            </div>
          )}
        </DarkCard>
      </div>
    </div>
  );
}