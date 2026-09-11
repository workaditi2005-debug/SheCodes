/**
 * TapTest — Motor Rhythmic Control (Parkinson's indicator)
 * User taps as fast as possible for 10 seconds.
 * We measure interval variability (std of inter-tap intervals).
 */
import { useState, useRef } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn } from "./RiskDashboard";
import { useAssessment } from "../context/AssessmentContext";

const TAP_DURATION = 10_000; // 10 seconds

function std(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

export default function TapTest({ setPage }) {
  const { setTapData } = useAssessment();
  const [phase, setPhase]       = useState("idle");   // idle | tapping | done
  const [tapCount, setTapCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [tapStd, setTapStd]     = useState(null);
  const [avgHz, setAvgHz]       = useState(null);

  const timestamps = useRef([]);
  const timerRef   = useRef(null);
  const countRef   = useRef(null);

  function startTapping() {
    timestamps.current = [];
    setTapCount(0);
    setTimeLeft(10);
    setPhase("tapping");

    const end = Date.now() + TAP_DURATION;
    timerRef.current = setInterval(() => {
      const rem = Math.ceil((end - Date.now()) / 1000);
      setTimeLeft(rem);
      if (rem <= 0) finish();
    }, 200);
  }

  function handleTap() {
    if (phase !== "tapping") return;
    timestamps.current.push(Date.now());
    setTapCount(t => t + 1);
  }

  function finish() {
    clearInterval(timerRef.current);
    setPhase("done");

    const ts  = timestamps.current;
    const intervals = ts.slice(1).map((t, i) => t - ts[i]);
    const s   = Math.round(std(intervals));
    const hz  = ts.length / (TAP_DURATION / 1000);

    setTapStd(s);
    setAvgHz(parseFloat(hz.toFixed(1)));

    setTapData({
      intervals,
      tap_count: ts.length,
    });
  }

  return (
    <div>
      <button onClick={() => setPage("assessments")} style={{ background: "none", border: "none", color: T.creamFaint, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, marginBottom: 24 }}>← Back</button>
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, letterSpacing: -1, marginBottom: 6 }}>Motor Tap Test</h1>
      <p style={{ color: T.creamFaint, fontSize: 14, marginBottom: 32 }}>Tap as fast as you can for 10 seconds. Rhythm consistency is a motor control signal.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Tap zone */}
        <DarkCard style={{ padding: 0, overflow: "hidden" }} hover={false}>
          <div
            onClick={phase === "idle" ? startTapping : handleTap}
            style={{
              minHeight: 360,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: phase === "idle" || phase === "tapping" ? "pointer" : "default",
              userSelect: "none",
              background: phase === "tapping"
                ? `radial-gradient(circle at center, rgba(96,165,250,0.12) 0%, transparent 70%)`
                : "transparent",
              transition: "background 0.1s",
              padding: 40,
              textAlign: "center",
            }}
            onMouseDown={phase === "tapping" ? e => { e.preventDefault(); handleTap(); } : undefined}
          >
            {phase === "idle" && (
              <>
                <div style={{ fontSize: 72, marginBottom: 20 }}>👆</div>
                <div style={{ fontWeight: 700, color: T.cream, fontSize: 20, marginBottom: 8 }}>Click to Start</div>
                <div style={{ color: T.creamFaint, fontSize: 14 }}>Tap this area as fast as possible for 10 seconds</div>
              </>
            )}
            {phase === "tapping" && (
              <>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 96, color: T.blue, lineHeight: 1, marginBottom: 8, textShadow: `0 0 40px ${T.blue}55` }}>{timeLeft}</div>
                <div style={{ color: T.creamFaint, fontSize: 14, marginBottom: 24 }}>Keep tapping!</div>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 64, color: T.cream }}>{tapCount}</div>
                <div style={{ color: T.creamFaint, fontSize: 13 }}>taps</div>
              </>
            )}
            {phase === "done" && (
              <>
                <div style={{ fontSize: 64, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, color: T.cream, fontSize: 20 }}>Test complete!</div>
                <div style={{ color: T.creamFaint, fontSize: 14, marginTop: 8 }}>{tapCount} taps recorded</div>
              </>
            )}
          </div>
        </DarkCard>

        {/* Results */}
        <DarkCard style={{ padding: 28 }} hover={false}>
          <div style={{ fontSize: 11, color: T.creamFaint, letterSpacing: 1, textTransform: "uppercase", marginBottom: 20 }}>Results</div>
          {phase === "done" && tapStd !== null ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Tap Count",     v: tapCount,           c: T.cream },
                  { label: "Speed",         v: `${avgHz} /sec`,    c: avgHz >= 5 ? T.green : T.amber },
                  { label: "Interval Std",  v: `${tapStd}ms`,      c: tapStd < 40 ? T.green : tapStd < 80 ? T.amber : T.red },
                  { label: "Rhythm",        v: tapStd < 40 ? "Consistent" : tapStd < 80 ? "Variable" : "Irregular", c: tapStd < 40 ? T.green : tapStd < 80 ? T.amber : T.red },
                ].map(m => (
                  <div key={m.label} style={{ background: T.bg3, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: T.creamFaint, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontWeight: 700, color: m.c, fontSize: 20 }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(74,222,128,0.08)", borderRadius: 14, padding: 18, border: "1px solid rgba(74,222,128,0.15)", marginBottom: 16 }}>
                <div style={{ color: T.green, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>✓ Motor data captured</div>
                <div style={{ color: T.creamFaint, fontSize: 13, lineHeight: 1.65 }}>
                  Interval variability (std = {tapStd}ms) is the primary motor rhythm metric. Lower std = better rhythmic motor control.
                </div>
              </div>
              <Btn onClick={() => setPage("assessments")} style={{ width: "100%", justifyContent: "center" }}>← Back to Tests</Btn>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "70px 0", color: T.creamFaint }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>🥁</div>
              <div style={{ fontSize: 14 }}>Results appear after test</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>10 second tapping task</div>
            </div>
          )}
        </DarkCard>
      </div>
    </div>
  );
}
