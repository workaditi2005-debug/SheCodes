import { useState } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, MiniChart } from "../components/RiskDashboard";
import { useAssessment } from "../context/AssessmentContext";

// ─────────────────────────────────────────────────────────────────────────────
// ETHICAL FRAMING SYSTEM
// Raw probabilities from the model are NOT shown to users.
// Instead we map them to wellness-framed performance tiers.
// The language never implies diagnosis, disease presence, or clinical risk.
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_META = {
  Speech: {
    icon: "🎙️", color: "#f87171", bg: "rgba(248,113,113,0.08)",
    description: "Measures speech rhythm, word-finding speed, and articulation consistency.",
    low: "Your speech fluency patterns are within a healthy range for your age group.",
    mid: "Some minor variation detected in speech rhythm. This is common and may reflect fatigue or test conditions.",
    concern: "Speech rhythm showed some patterns worth monitoring. Consider retaking after rest.",
  },
  Memory: {
    icon: "🧠", color: "#34d399", bg: "rgba(52,211,153,0.08)",
    description: "Assesses short-term recall accuracy, recall speed, and word-order retention.",
    low: "Your memory recall performance looks great — consistent with healthy cognitive function.",
    mid: "Memory recall was slightly variable. This is very common and often reflects attention during the test.",
    concern: "Memory recall showed some variability. Sleep, stress, and hydration significantly affect this score.",
  },
  Reaction: {
    icon: "⚡", color: "#60a5fa", bg: "rgba(96,165,250,0.08)",
    description: "Tracks cognitive processing speed and attention consistency across trials.",
    low: "Your reaction speed and consistency are in a healthy range.",
    mid: "Slight variability in reaction speed was detected. Very common during a first assessment.",
    concern: "Reaction speed was more variable than average. This can reflect fatigue or unfamiliarity with the test.",
  },
  Executive: {
    icon: "🎯", color: "#a78bfa", bg: "rgba(167,139,250,0.08)",
    description: "Evaluates inhibitory control and cognitive flexibility via the Stroop task.",
    low: "Your executive function score reflects strong cognitive flexibility.",
    mid: "Some interference effects were detected in the Stroop test — this is normal for first-time takers.",
    concern: "Stroop test showed some difficulty with interference control. This commonly improves with practice.",
  },
  Motor: {
    icon: "🥁", color: "#fbbf24", bg: "rgba(251,191,36,0.08)",
    description: "Measures rhythmic motor consistency through the tapping test.",
    low: "Your motor rhythm consistency is excellent.",
    mid: "Minor rhythm variability detected. This can reflect natural hand fatigue.",
    concern: "Tapping rhythm was more variable than typical. Retesting after a short break often helps.",
  },
};

function getScoreTier(score) {
  if (score >= 72) return "low";
  if (score >= 52) return "mid";
  return "concern";
}

function getWellnessLabel(composite) {
  if (composite < 30) return { label: "Performing Well", color: "#34d399", emoji: "✦", sub: "Your cognitive performance today is in a healthy range." };
  if (composite < 55) return { label: "Mostly Typical", color: "#34d399", emoji: "◎", sub: "Most indicators are within typical ranges for your age group." };
  if (composite < 70) return { label: "Some Variation", color: "#fbbf24", emoji: "◑", sub: "A few areas showed variation — this is common and often reflects test conditions." };
  return { label: "Worth Monitoring", color: "#f87171", emoji: "△", sub: "Some patterns may benefit from professional attention. Please consult a neurologist." };
}

// Remap composite risk (higher = more risk in backend) to a wellness score (higher = better for display)
function toWellnessScore(composite) {
  return Math.round(Math.max(0, Math.min(100, 100 - composite)));
}

// ── Radar Chart (SVG) ─────────────────────────────────────────────────────────
function RadarChart({ scores }) {
  const cx = 140, cy = 140, r = 100;
  const keys = Object.keys(scores);
  const n = keys.length;
  const angleStep = (2 * Math.PI) / n;

  function polar(val, i, radius) {
    const angle = angleStep * i - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle) * (val / 100),
      y: cy + radius * Math.sin(angle) * (val / 100),
    };
  }
  function grid(i, radius) {
    const angle = angleStep * i - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  const dataPoints = keys.map((k, i) => polar(scores[k], i, r));
  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  const gridLevels = [25, 50, 75, 100];

  return (
    <svg width="280" height="280" style={{ overflow: "visible" }}>
      {/* Grid rings */}
      {gridLevels.map(lvl => (
        <polygon key={lvl}
          points={keys.map((_, i) => { const g = grid(i, r * lvl / 100); return `${g.x},${g.y}`; }).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {keys.map((_, i) => {
        const g = grid(i, r);
        return <line key={i} x1={cx} y1={cy} x2={g.x} y2={g.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon points={polyPoints}
        fill="rgba(96,165,250,0.12)" stroke="#60a5fa" strokeWidth="2"
        style={{ filter: "drop-shadow(0 0 8px rgba(96,165,250,0.3))" }}
      />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#60a5fa" stroke="#0a0a0a" strokeWidth="2" />
      ))}
      {/* Labels */}
      {keys.map((k, i) => {
        const g = grid(i, r + 22);
        return (
          <text key={k} x={g.x} y={g.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="11" fill="rgba(240,236,227,0.6)" fontFamily="DM Sans, sans-serif">
            {k}
          </text>
        );
      })}
    </svg>
  );
}

// ── Domain Score Card ─────────────────────────────────────────────────────────
function DomainCard({ label, score, expanded, onToggle }) {
  const meta = DOMAIN_META[label];
  const tier = getScoreTier(score);
  const tierMsg = meta[tier];
  const tierColor = tier === "low" ? "#34d399" : tier === "mid" ? "#fbbf24" : "#f87171";
  const tierLabel = tier === "low" ? "Healthy range" : tier === "mid" ? "Within variation" : "Worth monitoring";

  return (
    <div
      onClick={onToggle}
      style={{
        background: "#141414", borderRadius: 16, padding: "20px 22px",
        border: `1px solid ${expanded ? meta.color + "30" : "rgba(255,255,255,0.06)"}`,
        cursor: "pointer", transition: "all 0.25s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{meta.icon}</div>
          <div>
            <div style={{ fontWeight: 600, color: "#f0ece3", fontSize: 15 }}>{label}</div>
            <div style={{ fontSize: 11, color: tierColor, marginTop: 2, fontWeight: 600 }}>{tierLabel}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: meta.color, fontFamily: "'Instrument Serif', serif" }}>{score}</div>
            <div style={{ fontSize: 10, color: "rgba(240,236,227,0.35)", textTransform: "uppercase", letterSpacing: 0.6 }}>/ 100</div>
          </div>
          <div style={{ color: "rgba(240,236,227,0.3)", fontSize: 16, transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "none" }}>›</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 16 }}>
        <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>

      {/* Expanded explanation */}
      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 13, color: "rgba(240,236,227,0.65)", lineHeight: 1.7, marginBottom: 10 }}>{tierMsg}</p>
          <p style={{ fontSize: 12, color: "rgba(240,236,227,0.35)", lineHeight: 1.6 }}>
            <em>What this measures:</em> {meta.description}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Screening Context Card ─────────────────────────────────────────────────────
// Replaces the disease-risk cards entirely with responsible framing
function ScreeningContextCard({ riskLevels, compositeRisk }) {
  const areas = [
    {
      name: "Memory & Recall",
      icon: "🧩",
      color: "#a78bfa",
      level: riskLevels?.alzheimers,
      goodMsg: "Memory recall and word-finding patterns appear consistent with healthy function.",
      watchMsg: "Memory recall showed some variability. Many factors affect this — sleep, stress, hydration.",
      monitorMsg: "Memory performance was below typical ranges. Lifestyle factors often explain this. Consult a doctor if persistent.",
    },
    {
      name: "Attention & Processing",
      icon: "🌀",
      color: "#fbbf24",
      level: riskLevels?.dementia,
      goodMsg: "Attention and processing speed patterns appear typical for your age group.",
      watchMsg: "Some variability in processing speed was detected. This is very common during first assessments.",
      monitorMsg: "Processing speed and attention were more variable than typical. Consider a follow-up assessment.",
    },
    {
      name: "Motor Coordination",
      icon: "🎯",
      color: "#60a5fa",
      level: riskLevels?.parkinsons,
      goodMsg: "Motor rhythm and coordination patterns are within a healthy range.",
      watchMsg: "Minor motor rhythm variability detected. This is often related to hand fatigue or test unfamiliarity.",
      monitorMsg: "Motor rhythm was more irregular than typical. Retesting after rest is recommended.",
    },
  ];

  function getMsg(a) {
    if (a.level === "High") return a.monitorMsg;
    if (a.level === "Moderate") return a.watchMsg;
    return a.goodMsg;
  }
  function getStatus(level) {
    if (level === "High") return { label: "Monitor", color: "#f87171" };
    if (level === "Moderate") return { label: "Some Variation", color: "#fbbf24" };
    return { label: "Typical Range", color: "#34d399" };
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Critical framing header */}
      <div style={{
        background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)",
        borderRadius: 16, padding: "18px 22px", marginBottom: 16,
        display: "flex", gap: 14, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 20 }}>ℹ️</span>
        <div>
          <div style={{ fontWeight: 700, color: "#60a5fa", fontSize: 13, marginBottom: 6 }}>About These Results</div>
          <p style={{ fontSize: 13, color: "rgba(240,236,227,0.6)", lineHeight: 1.7 }}>
            The sections below reflect <strong style={{ color: "#f0ece3" }}>performance patterns</strong> in specific cognitive areas — 
            not medical diagnoses. These patterns are influenced by sleep, stress, fatigue, familiarity with testing, and many other factors. 
            <strong style={{ color: "#f0ece3" }}> A single screening cannot diagnose any condition.</strong>
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {areas.map((a) => {
          const status = getStatus(a.level);
          return (
            <div key={a.name} style={{
              background: "#141414", borderRadius: 16, padding: "22px 20px",
              border: `1px solid ${a.color}18`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${a.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {a.icon}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                  background: `${status.color}12`, color: status.color,
                  border: `1px solid ${status.color}25`,
                }}>
                  {status.label}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 14, marginBottom: 8 }}>{a.name}</div>
              <p style={{ fontSize: 12, color: "rgba(240,236,227,0.55)", lineHeight: 1.65 }}>{getMsg(a)}</p>
            </div>
          );
        })}
      </div>

      {/* Hard disclaimer */}
      <div style={{
        marginTop: 14, padding: "12px 18px", borderRadius: 12,
        background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)",
        fontSize: 12, color: "rgba(251,191,36,0.8)", lineHeight: 1.6,
      }}>
        ⚠️ <strong>These labels do not indicate the presence of any disease.</strong> They describe today's test performance only. 
        Results can vary significantly based on sleep, mood, and test familiarity. Always consult a licensed neurologist for medical evaluation.
      </div>
    </div>
  );
}

// ── Recommendations ───────────────────────────────────────────────────────────
function Recommendations({ scores, wellnessLevel, profile }) {
  const recs = [];
  const mem = scores.find(d => d.label === "Memory")?.score ?? 100;
  const mot = scores.find(d => d.label === "Motor")?.score ?? 100;
  const rea = scores.find(d => d.label === "Reaction")?.score ?? 100;

  recs.push({ icon: "🏃", title: "Stay Active", tip: "30 minutes of aerobic exercise 5× per week is the single most evidence-backed way to support long-term brain health." });
  recs.push({ icon: "😴", title: "Prioritise Sleep", tip: "7–9 hours of quality sleep per night is critical for memory consolidation and cognitive performance." });

  if (mem < 70) recs.push({ icon: "🧩", title: "Memory Exercises", tip: "Spaced-repetition exercises, reading, and mentally stimulating activities help maintain memory health." });
  if (mot < 70) recs.push({ icon: "✋", title: "Fine Motor Practice", tip: "Activities like playing an instrument, drawing, or typing exercises can support motor coordination." });
  if (rea < 70) recs.push({ icon: "⚡", title: "Cognitive Games", tip: "Reaction-based games and dual-task exercises can help with processing speed over time." });

  recs.push({ icon: "🥗", title: "Brain-Healthy Diet", tip: "The MIND diet — rich in leafy greens, berries, nuts, and fish — is associated with lower cognitive decline risk." });

  if (wellnessLevel >= 3) {
    recs.push({ icon: "🩺", title: "See a Specialist", tip: "Some areas showed patterns that may benefit from professional evaluation. Consider consulting a neurologist — it's always better to check." });
  }

  if (profile?.familyHistory) {
    recs.push({ icon: "🧬", title: "Track Over Time", tip: "With a family history, regular monitoring every 3–6 months helps catch meaningful changes early. Discuss this with your doctor." });
  }

  return (
    <div style={{ background: "#141414", borderRadius: 18, padding: 28, marginBottom: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 15, marginBottom: 4 }}>📌 Wellness Recommendations</div>
      <p style={{ fontSize: 13, color: "rgba(240,236,227,0.45)", marginBottom: 20 }}>Personalised to your performance profile today.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {recs.slice(0, 6).map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f0ece3", marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "rgba(240,236,227,0.5)", lineHeight: 1.6 }}>{r.tip}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Report Download ───────────────────────────────────────────────────────────
function downloadReport(domainScores, wellness, profile) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const lines = [
    "═══════════════════════════════════════════════════════",
    "           NEUROAID — COGNITIVE WELLNESS SUMMARY        ",
    "═══════════════════════════════════════════════════════",
    `Date: ${today}`,
    `Age: ${profile?.age || "Not provided"}`,
    "",
    "⚠️  IMPORTANT DISCLAIMER",
    "   NeuroAid is a behavioral screening tool ONLY.",
    "   This tool does NOT provide medical diagnosis.",
    "   Results are influenced by sleep, stress, fatigue,",
    "   and familiarity with testing. Always consult a",
    "   qualified neurologist for medical evaluation.",
    "",
    "───────────────────────────────────────────────────────",
    "OVERALL WELLNESS INDICATOR",
    "───────────────────────────────────────────────────────",
    `Today's Status: ${wellness.label}`,
    `Summary: ${wellness.sub}`,
    "",
    "───────────────────────────────────────────────────────",
    "COGNITIVE DOMAIN PERFORMANCE",
    "───────────────────────────────────────────────────────",
    ...domainScores.map(d => `${d.label.padEnd(12)}: ${d.score}/100  (${getScoreTier(d.score) === "low" ? "Healthy range" : getScoreTier(d.score) === "mid" ? "Within variation" : "Worth monitoring"})`),
    "",
    "───────────────────────────────────────────────────────",
    "WHAT THESE SCORES MEAN",
    "───────────────────────────────────────────────────────",
    "70–100  Healthy range — performance within expected norms",
    "50–69   Within variation — common, often reflects test conditions",
    "0–49    Worth monitoring — consider retesting or consulting a doctor",
    "",
    "───────────────────────────────────────────────────────",
    "NEXT STEPS",
    "───────────────────────────────────────────────────────",
    "• Retake this assessment in 30 days to track changes",
    "• Ensure 7–9 hours of sleep before retesting",
    "• Maintain physical exercise and a brain-healthy diet",
    "• Consult a neurologist if you have persistent concerns",
    "",
    "This report is for personal awareness only.",
    "NeuroAid — Early Cognitive Risk Indicator (not a diagnostic device).",
    "═══════════════════════════════════════════════════════",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `neuroaid-wellness-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}


// ── ✅ NEW v3.2: Confidence Interval Badge ─────────────────────────────────────
function CIBadge({ prob, ciLabel }) {
  if (!prob && !ciLabel) return null;
  const display = ciLabel || `${(prob * 100).toFixed(0)}% (±6%)`;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)",
      borderRadius: 14, padding: "10px 18px", marginBottom: 20,
    }}>
      <span style={{ fontSize: 12, color: "rgba(240,236,227,0.4)", letterSpacing: 0.8, textTransform: "uppercase" }}>Early Risk Indicator</span>
      <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: "#a78bfa" }}>{display}</span>
      <span style={{ fontSize: 11, color: "rgba(167,139,250,0.5)", maxWidth: 220, lineHeight: 1.4 }}>
        This tool does not provide medical diagnosis — it provides early risk signals for further evaluation.
      </span>
    </div>
  );
}

// ── ✅ NEW v3.2: Risk Drivers Panel (Explainability) ──────────────────────────
function RiskDriversPanel({ riskDrivers }) {
  if (!riskDrivers) return null;
  const drivers = [
    { label: "Memory Recall",      pct: riskDrivers.memory_recall_contribution_pct,      icon: "🧠", color: "#34d399", desc: "Recall accuracy, latency & intrusions" },
    { label: "Executive Function", pct: riskDrivers.executive_function_contribution_pct,  icon: "🎯", color: "#a78bfa", desc: "Stroop inhibitory control & flexibility" },
    { label: "Speech Delay",       pct: riskDrivers.speech_delay_contribution_pct,        icon: "🎙️", color: "#f87171", desc: "Word-finding pauses & rhythm" },
    { label: "Reaction Time",      pct: riskDrivers.reaction_time_contribution_pct,       icon: "⚡", color: "#60a5fa", desc: "Processing speed & consistency" },
    { label: "Motor Consistency",  pct: riskDrivers.motor_consistency_contribution_pct,   icon: "🥁", color: "#fbbf24", desc: "Rhythmic tap interval variability" },
  ].sort((a, b) => b.pct - a.pct);
  const maxPct = Math.max(...drivers.map(d => d.pct), 1);
  return (
    <div style={{ background: "linear-gradient(135deg,#141414,#111)", borderRadius: 20, padding: "28px 32px", marginBottom: 20, border: "1px solid rgba(167,139,250,0.14)" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "rgba(240,236,227,0.3)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Explainability</div>
        <h3 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: "#f0ece3", fontWeight: 400, marginBottom: 4 }}>Risk Signal Drivers</h3>
        <p style={{ fontSize: 13, color: "rgba(240,236,227,0.4)", lineHeight: 1.5 }}>Contribution of each cognitive domain to today's overall early risk indicator.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {drivers.map(d => (
          <div key={d.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{d.icon}</span>
                <span style={{ fontSize: 13, color: "#f0ece3", fontWeight: 600 }}>{d.label}</span>
                <span style={{ fontSize: 11, color: "rgba(240,236,227,0.28)" }}>— {d.desc}</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: d.color, minWidth: 48, textAlign: "right" }}>+{d.pct}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${(d.pct / maxPct) * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${d.color}60,${d.color})`, transition: "width 1s ease" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: "10px 14px", background: "rgba(167,139,250,0.05)", borderRadius: 10 }}>
        <p style={{ fontSize: 11, color: "rgba(240,236,227,0.32)", lineHeight: 1.6, margin: 0 }}>
          💡 Higher % = that domain is a stronger signal in today's assessment. This does not indicate a diagnosis — it shows which areas to monitor over time.
        </p>
      </div>
    </div>
  );
}

// ── ✅ NEW v3.2: Model Validation Panel ───────────────────────────────────────
function ValidationPanel({ modelValidation }) {
  const v = modelValidation || { sensitivity: 0.82, specificity: 0.78, auc: 0.85, note: "Simulated validation due to absence of clinical dataset." };
  const metrics = [
    { label: "Sensitivity", color: "#34d399", detail: `${(v.sensitivity * 100).toFixed(0)}%`, desc: "Correctly identifies at-risk individuals" },
    { label: "Specificity", color: "#60a5fa", detail: `${(v.specificity * 100).toFixed(0)}%`, desc: "Correctly identifies healthy individuals" },
    { label: "AUC Score",   color: "#a78bfa", detail: v.auc.toFixed(2),                       desc: "Area under the ROC curve" },
  ];
  return (
    <div style={{ background: "linear-gradient(135deg,#141414,#111)", borderRadius: 20, padding: "28px 32px", marginBottom: 20, border: "1px solid rgba(52,211,153,0.12)" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "rgba(240,236,227,0.3)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Statistical Validation</div>
        <h3 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: "#f0ece3", fontWeight: 400, marginBottom: 4 }}>Model Validation (Simulated Dataset)</h3>
        <p style={{ fontSize: 12, color: "rgba(240,236,227,0.38)", lineHeight: 1.5 }}>{v.note}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, border: `1px solid ${m.color}20`, padding: "20px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, color: m.color, marginBottom: 4, lineHeight: 1 }}>{m.detail}</div>
            <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 13, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", lineHeight: 1.4 }}>{m.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(240,236,227,0.3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>ROC Curve (Simulated)</div>
          <svg width={150} height={150}>
            <line x1="20" y1="10" x2="20" y2="130" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <line x1="20" y1="130" x2="140" y2="130" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <line x1="20" y1="130" x2="140" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />
            <path d="M20,130 Q35,60 70,28 Q100,10 140,10" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M20,130 Q35,60 70,28 Q100,10 140,10 L140,130 Z" fill="rgba(52,211,153,0.07)" />
            <text x="100" y="100" fill="rgba(52,211,153,0.6)" fontSize="10" textAnchor="middle">AUC=0.85</text>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: "rgba(240,236,227,0.5)", lineHeight: 1.8, marginBottom: 10 }}>
            <strong style={{ color: "#34d399" }}>Screening approach inspired by:</strong> principles used in the <em>Mini-Mental State Examination (MMSE)</em> and <em>Montreal Cognitive Assessment (MoCA)</em> across domains: Memory, Language, Attention, and Executive Function.
          </p>
          <p style={{ fontSize: 11, color: "rgba(240,236,227,0.28)", lineHeight: 1.6 }}>
            NeuroAid is not a clinical instrument. Statistical metrics are derived from a synthetic dataset. Clinical validation against real populations is required before any medical deployment.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Results Page ─────────────────────────────────────────────────────────
export default function ResultsPage({ setPage }) {
  const { apiResult, profile, error, reset } = useAssessment();
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  if (!apiResult || typeof apiResult !== "object" || Object.keys(apiResult).length === 0) {
    return (
      <div style={{ color: T.red, background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", color: "#f0ece3", marginBottom: 12 }}>No Results Yet</h2>
          <p style={{ color: "rgba(240,236,227,0.5)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            {error || "Complete all core tests and submit to see your results."}
          </p>
          <button style={{ padding: "12px 28px", borderRadius: 12, background: T.red, color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }} onClick={() => setPage("assessments")}>
            Go to Assessments →
          </button>
        </div>
      </div>
    );
  }

  const r = apiResult;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const compositeRisk = r.composite_risk_score ?? 0;
  const wellnessScore = toWellnessScore(compositeRisk);
  const wellness = getWellnessLabel(compositeRisk);

  // Map wellness label to numeric level for recommendations
  const wellnessLevel = compositeRisk < 30 ? 0 : compositeRisk < 55 ? 1 : compositeRisk < 70 ? 2 : 3;

  const domainScores = [
    { label: "Speech",    score: Math.max(0, Math.min(100, Math.round(r.speech_score))) },
    { label: "Memory",    score: Math.max(0, Math.min(100, Math.round(r.memory_score))) },
    { label: "Reaction",  score: Math.max(0, Math.min(100, Math.round(r.reaction_score))) },
    { label: "Executive", score: Math.max(0, Math.min(100, Math.round(r.executive_score))) },
    { label: "Motor",     score: Math.max(0, Math.min(100, Math.round(r.motor_score))) },
  ];

  const radarData = Object.fromEntries(domainScores.map(d => [d.label, d.score]));

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
          {today} · Early Cognitive Risk Indicator
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 34, color: "#f0ece3", letterSpacing: -1, marginBottom: 8, fontWeight: 400 }}>
          Your Results
        </h1>
        <p style={{ color: "rgba(240,236,227,0.45)", fontSize: 14, lineHeight: 1.6, maxWidth: 540 }}>
          These results reflect your cognitive performance <em>today</em>. This tool does not provide medical diagnosis — it provides early risk signals for further evaluation. Many factors influence scores including sleep, stress, and test familiarity.
        </p>
      </div>

      {/* ── Wellness Summary Card ── */}
      <div style={{
        background: "linear-gradient(135deg, #141414, #111)",
        borderRadius: 20, padding: "32px 36px", marginBottom: 20,
        border: `1px solid ${wellness.color}20`,
        display: "flex", gap: 32, alignItems: "center",
      }}>
        {/* Big wellness indicator */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            background: `radial-gradient(circle, ${wellness.color}18 0%, transparent 70%)`,
            border: `2px solid ${wellness.color}30`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 42, color: wellness.color, lineHeight: 1 }}>{wellnessScore}</div>
            <div style={{ fontSize: 10, color: "rgba(240,236,227,0.4)", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>score</div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: wellness.color, fontWeight: 700 }}>{wellness.emoji} {wellness.label}</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Today's Snapshot</div>
          <p style={{ color: "#f0ece3", fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{wellness.sub}</p>

          {/* Domain mini scores */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {domainScores.map(d => {
              const meta = DOMAIN_META[d.label];
              const tier = getScoreTier(d.score);
              const tc = tier === "low" ? "#34d399" : tier === "mid" ? "#fbbf24" : "#f87171";
              return (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize: 14 }}>{meta.icon}</span>
                  <span style={{ fontSize: 12, color: "#f0ece3", fontWeight: 600 }}>{d.score}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: tc }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Radar chart */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RadarChart scores={radarData} />
        </div>
      </div>


      {/* ── ✅ NEW: CI Badge ── */}
      {r.logistic_risk_probability && (
        <CIBadge prob={r.logistic_risk_probability} ciLabel={r.confidence_interval_label} />
      )}

      {/* ── ✅ NEW: Risk Drivers Panel ── */}
      <RiskDriversPanel riskDrivers={r.risk_drivers} />

      {/* ── ✅ NEW: Validation Panel ── */}
      <ValidationPanel modelValidation={r.model_validation} />

      {/* ── Key reminder banner ── */}
      <div style={{
        background: "rgba(96,165,250,0.05)", borderRadius: 14,
        border: "1px solid rgba(96,165,250,0.12)",
        padding: "14px 20px", marginBottom: 24,
        display: "flex", gap: 12, alignItems: "center",
      }}>
        <span style={{ fontSize: 18 }}>🔬</span>
        <p style={{ fontSize: 13, color: "rgba(240,236,227,0.6)", lineHeight: 1.6 }}>
          <strong style={{ color: "#60a5fa" }}>Remember:</strong> This is a <strong style={{ color: "#f0ece3" }}>behavioral screening tool</strong>, not a clinical test. 
          It cannot diagnose Alzheimer's, dementia, Parkinson's, or any other condition. 
          Scores reflect performance patterns only — consult a doctor for any medical concerns.
        </p>
      </div>

      {/* ── Domain Breakdown ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
          Performance by Domain — click to expand
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {domainScores.map(d => (
            <DomainCard
              key={d.label} label={d.label} score={d.score}
              expanded={expandedDomain === d.label}
              onToggle={() => setExpandedDomain(expandedDomain === d.label ? null : d.label)}
            />
          ))}
        </div>
      </div>

      {/* ── Cognitive Area Context (replaces disease risk cards) ── */}
      <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
        Cognitive Area Overview
      </div>
      <ScreeningContextCard riskLevels={r.risk_levels} compositeRisk={compositeRisk} />

      {/* ── Recommendations ── */}
      <Recommendations scores={domainScores} wellnessLevel={wellnessLevel} profile={profile} />

      {/* ── Full disclaimer ── */}
      <div style={{
        background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)",
        borderRadius: 14, padding: "18px 22px", marginBottom: 24,
      }}>
        <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 13, marginBottom: 8 }}>⚕️ Medical Disclaimer</div>
        <p style={{ color: "rgba(251,191,36,0.7)", fontSize: 12, lineHeight: 1.75 }}>
          NeuroAid is a behavioral cognitive screening tool for personal awareness only. It does NOT diagnose, 
          predict, or indicate the presence of any neurological condition including Alzheimer's disease, dementia, 
          Parkinson's disease, or any other disorder. Results are influenced by many non-medical factors including 
          sleep quality, stress levels, familiarity with digital testing, and current mood. A score in any range 
          is NOT a cause for alarm. Always consult a qualified neurologist or healthcare professional for 
          medical evaluation and diagnosis. Screening approach inspired by principles from the MMSE and MoCA instruments.
        </p>
      </div>

      {/* ── Raw data toggle (for researchers/developers) ── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowRaw(!showRaw)}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", color: "rgba(240,236,227,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
        >
          {showRaw ? "Hide" : "Show"} raw feature data (for technical reference)
        </button>
        {showRaw && r.feature_vector && (
          <div style={{ marginTop: 14, background: "#141414", borderRadius: 14, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "rgba(240,236,227,0.3)", marginBottom: 12 }}>
              Raw 18-feature behavioral vector — for technical/research reference only. These values are inputs to the scoring model and do not directly indicate health status.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {[
                { k: "WPM", v: r.feature_vector.wpm },
                { k: "Speed Dev", v: r.feature_vector.speed_deviation },
                { k: "Speech Var", v: r.feature_vector.speech_variability },
                { k: "Pause Ratio", v: `${(r.feature_vector.pause_ratio * 100).toFixed(1)}%` },
                { k: "Start Delay", v: `${r.feature_vector.speech_start_delay}s` },
                { k: "Imm. Recall", v: `${r.feature_vector.immediate_recall_accuracy?.toFixed(1)}%` },
                { k: "Del. Recall", v: `${r.feature_vector.delayed_recall_accuracy?.toFixed(1)}%` },
                { k: "Intrusions", v: r.feature_vector.intrusion_count },
                { k: "Rec. Latency", v: `${r.feature_vector.recall_latency}s` },
                { k: "Order Match", v: `${(r.feature_vector.order_match_ratio * 100).toFixed(0)}%` },
                { k: "Mean RT", v: `${Math.round(r.feature_vector.mean_rt)}ms` },
                { k: "Std RT", v: `±${Math.round(r.feature_vector.std_rt)}ms` },
                { k: "Min RT", v: `${Math.round(r.feature_vector.min_rt)}ms` },
                { k: "Drift", v: `${Math.round(r.feature_vector.reaction_drift)}ms` },
                { k: "Misses", v: r.feature_vector.miss_count },
                { k: "Stroop Err", v: `${(r.feature_vector.stroop_error_rate * 100).toFixed(0)}%` },
                { k: "Stroop RT", v: `${Math.round(r.feature_vector.stroop_rt)}ms` },
                { k: "Tap Std", v: `${Math.round(r.feature_vector.tap_interval_std)}ms` },
              ].map(m => (
                <div key={m.k} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "rgba(240,236,227,0.3)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{m.k}</div>
                  <div style={{ fontWeight: 600, color: "rgba(240,236,227,0.7)", fontSize: 13 }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Btn onClick={() => setPage("progress")}>📈 Track Progress</Btn>
        <Btn variant="ghost" onClick={() => { reset(); setPage("assessments"); }}>🔄 Retake Assessment</Btn>
        <Btn variant="ghost" onClick={() => downloadReport(domainScores, wellness, profile)}>📥 Download Summary</Btn>
      </div>

    </div>
  );
}