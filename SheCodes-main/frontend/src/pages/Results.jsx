import { useState } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Badge, MiniChart } from "../components/RiskDashboard";

// Legacy static demo results page (not actively routed).
// Uses hardcoded scores for demo/presentation purposes.
// For live results, see ResultsPage.jsx which reads from AssessmentContext.

const SCORES = [
  { label: "Speech Analysis", score: 74, icon: "🎙️", color: T.red },
  { label: "Memory Recall",   score: 82, icon: "🧠", color: T.green },
  { label: "Reaction Time",   score: 68, icon: "⚡", color: T.blue },
];

export default function Results({ setPage }) {
  const overall = Math.round(SCORES.reduce((s, x) => s + x.score, 0) / SCORES.length);

  return (
    <div>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, letterSpacing: -1, marginBottom: 6 }}>
          Assessment Results
        </h1>
        <p style={{ color: T.creamFaint, fontSize: 14 }}>February 19, 2026 · All three domains assessed</p>
      </div>

      {/* Overall score */}
      <DarkCard style={{ padding: 40, marginBottom: 20, background: "linear-gradient(135deg,#161010,#100e0e)", border: "1px solid rgba(232,64,64,0.15)" }} hover={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: T.creamFaint, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>
              Overall Cognitive Score
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 96, color: T.cream, lineHeight: 1 }}>{overall}</span>
              <span style={{ color: T.creamFaint, fontSize: 24, paddingBottom: 14 }}>/100</span>
            </div>
            <div style={{ marginTop: 14 }}><Badge level="Low" /></div>
          </div>
          <MiniChart data={[58, 61, 64, 60, 67, 70, overall]} color={T.red} height={90} />
        </div>
      </DarkCard>

      {/* Domain cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
        {SCORES.map((s) => (
          <DarkCard key={s.label} style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 12, color: T.creamFaint, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 52, color: T.cream, lineHeight: 1, marginBottom: 10 }}>
              {s.score}
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${s.score}%`, background: s.color, borderRadius: 2, boxShadow: `0 0 8px ${s.color}44` }} />
            </div>
            <Badge level={s.score >= 75 ? "Low" : s.score >= 55 ? "Moderate" : "High"} />
          </DarkCard>
        ))}
      </div>

      {/* Clinical interpretation */}
      <DarkCard style={{ padding: 28, marginBottom: 20 }} hover={false}>
        <div style={{ fontWeight: 700, color: T.cream, fontSize: 15, marginBottom: 12 }}>Clinical Interpretation</div>
        <p style={{ color: T.creamFaint, lineHeight: 1.85, fontSize: 14 }}>
          Your overall score of <strong style={{ color: T.cream }}>{overall}/100</strong> places you in the{" "}
          <strong style={{ color: T.green }}>Low Risk</strong> category.
          Speech patterns show normal fluency. Memory recall is strong at 82%. Reaction time is within normal norms.
          <strong style={{ color: T.cream }}> Continue monthly assessments</strong> to monitor trends.
        </p>
      </DarkCard>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Btn onClick={() => setPage?.("progress")}>📈 View History</Btn>
        <Btn variant="ghost">📥 Download Report</Btn>
        <Btn variant="ghost" onClick={() => setPage?.("assessments")}>🔄 Retake</Btn>
      </div>
    </div>
  );
}
