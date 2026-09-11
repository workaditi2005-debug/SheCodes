import { useEffect, useState } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn } from "../components/RiskDashboard";
import { getMyResults } from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Progress Page — Longitudinal Tracking
// Ported from Firebase to V4 JSON API (getMyResults)
// ─────────────────────────────────────────────────────────────────────────────

// Domain scores from backend are 0–100 where HIGHER = healthier.
// composite_risk_score is 0–100 where HIGHER = more risk.
// For display we always show "wellness" style: higher = better.

function riskToWellness(compositeRisk) {
  // composite_risk_score: 0 = no risk (great), 100 = high risk (bad)
  // wellness: 0 = bad, 100 = great
  return Math.round(Math.max(0, Math.min(100, 100 - (compositeRisk ?? 50))));
}

// For domain scores (already higher=better), just clamp & round
function domainScore(val) {
  return Math.round(Math.max(0, Math.min(100, val ?? 0)));
}

// Compute overall wellness from a history entry
function entryOverall(h) {
  // Prefer composite_risk_score if saved; else average domain scores
  if (h.composite_risk_score != null) {
    return riskToWellness(h.composite_risk_score);
  }
  // Fallback: average of whichever domain scores exist (treat 0 as valid)
  const vals = [h.speech_score, h.memory_score, h.reaction_score, h.executive_score, h.motor_score]
    .filter(v => v != null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

function scoreTier(s) {
  if (s >= 70) return { label: "Healthy",  color: "#34d399" };
  if (s >= 50) return { label: "Typical",  color: "#fbbf24" };
  return              { label: "Monitor",  color: "#f87171" };
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 60, width = 200 }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 11, color: "rgba(240,236,227,0.2)" }}>Need 2+ sessions for trend</span>
    </div>
  );
  const max   = Math.max(...data, 1);
  const min   = Math.min(...data, 0);
  const range = max - min || 1;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        return i === data.length - 1
          ? <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#0a0a0a" strokeWidth="2" />
          : <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity="0.4" />;
      })}
    </svg>
  );
}

function TrendBadge({ data }) {
  if (!data || data.length < 2) return <span style={{ fontSize: 11, color: "rgba(240,236,227,0.3)" }}>—</span>;
  const diff  = data[data.length - 1] - data[0];
  const color = diff > 2 ? "#34d399" : diff < -2 ? "#f87171" : "#fbbf24";
  const arrow = diff > 2 ? "↑" : diff < -2 ? "↓" : "→";
  const label = diff > 2 ? `+${Math.round(diff)} pts` : diff < -2 ? `${Math.round(diff)} pts` : "Stable";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, padding: "3px 10px", borderRadius: 20,
      background: `${color}12`, border: `1px solid ${color}20` }}>
      {arrow} {label}
    </span>
  );
}

function DomainTrack({ label, icon, data, labels, color }) {
  const latest = data.length ? data[data.length - 1] : null;
  const tier   = scoreTier(latest ?? 0);
  const avg    = data.length ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0;

  return (
    <div style={{ background: "#141414", borderRadius: 16, padding: "22px 22px",
      border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 14 }}>{label}</div>
            <div style={{ fontSize: 11, color: tier.color, marginTop: 2, fontWeight: 600 }}>{tier.label}</div>
          </div>
        </div>
        <TrendBadge data={data} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(240,236,227,0.3)", marginBottom: 4 }}>Latest</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32,
            color: latest != null ? color : "rgba(240,236,227,0.2)", lineHeight: 1 }}>
            {latest != null ? latest : "—"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(240,236,227,0.3)", marginBottom: 4 }}>Session Avg</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(240,236,227,0.5)" }}>{data.length ? avg : "—"}</div>
        </div>
      </div>

      <Sparkline data={data} color={color} height={55} width={180} />

      {labels.length > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 9, color: "rgba(240,236,227,0.25)" }}>{labels[0]}</span>
          <span style={{ fontSize: 9, color: "rgba(240,236,227,0.25)" }}>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

function HistoryTable({ history }) {
  if (!history.length) return null;
  return (
    <div style={{ background: "#141414", borderRadius: 18, padding: 24,
      border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 15, marginBottom: 20 }}>Assessment History</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Date", "Overall", "Speech", "Memory", "Reaction", "Executive", "Motor"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10,
                  color: "rgba(240,236,227,0.3)", textTransform: "uppercase", letterSpacing: 0.8,
                  borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((a, i) => {
              const overall     = entryOverall(a);
              const overallTier = scoreTier(overall);
              // Support both timestamp and createdAt fields
              const rawDate = a.createdAt || a.timestamp;
              const date    = rawDate
                ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—";

              const domains = [a.speech_score, a.memory_score, a.reaction_score, a.executive_score, a.motor_score];

              return (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "12px 12px", color: "rgba(240,236,227,0.5)", fontSize: 12 }}>{date}</td>
                  <td style={{ padding: "12px 12px" }}>
                    <span style={{ fontWeight: 700, color: overallTier.color, fontSize: 14 }}>{overall}</span>
                    <span style={{ fontSize: 10, color: "rgba(240,236,227,0.3)", marginLeft: 4 }}>/100</span>
                  </td>
                  {domains.map((sc, j) => {
                    const missing = sc == null;
                    const v       = missing ? null : domainScore(sc);
                    const t       = missing ? null : scoreTier(v);
                    return (
                      <td key={j} style={{ padding: "12px 12px" }}>
                        {missing
                          ? <span style={{ color: "rgba(240,236,227,0.2)", fontSize: 12 }}>—</span>
                          : <span style={{ color: t.color, fontWeight: 600 }}>{v}</span>
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10,
        background: "rgba(255,255,255,0.02)", fontSize: 11,
        color: "rgba(240,236,227,0.3)", lineHeight: 1.6 }}>
        Score tiers: <span style={{ color: "#34d399" }}>■ 70–100 Healthy</span> · <span style={{ color: "#fbbf24" }}>■ 50–69 Typical</span> · <span style={{ color: "#f87171" }}>■ 0–49 Monitor</span>.
        Variation between sessions is normal. Scores are affected by sleep, mood, and test familiarity.
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ProgressPage({ setPage }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  useEffect(() => {
    setLoading(true);
    getMyResults()
      .then(results => setHistory(results || []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const hasData = history.length > 0;

  const labels = hasData
    ? history.map(h => {
        const raw = h.createdAt || h.timestamp;
        if (!raw) return "—";
        const d = new Date(raw);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      })
    : [];

  const speechData   = hasData ? history.map(h => domainScore(h.speech_score))    : [];
  const memoryData   = hasData ? history.map(h => domainScore(h.memory_score))    : [];
  const reactionData = hasData ? history.map(h => domainScore(h.reaction_score))  : [];
  const execData     = hasData ? history.map(h => domainScore(h.executive_score)) : [];
  const motorData    = hasData ? history.map(h => domainScore(h.motor_score))     : [];
  const overallData  = hasData ? history.map(entryOverall) : [];

  const latestOverall = overallData.length ? overallData[overallData.length - 1] : null;
  const latestTier    = scoreTier(latestOverall ?? 0);

  const latestComposite = hasData && history[history.length - 1]?.composite_risk_score != null
    ? Math.round(history[history.length - 1].composite_risk_score)
    : null;

  const domains = [
    { label: "Speech",    icon: "🎙️", data: speechData,   color: "#f87171" },
    { label: "Memory",    icon: "🧠", data: memoryData,   color: "#34d399" },
    { label: "Reaction",  icon: "⚡", data: reactionData, color: "#60a5fa" },
    { label: "Executive", icon: "🎯", data: execData,     color: "#a78bfa" },
    { label: "Motor",     icon: "🥁", data: motorData,    color: "#fbbf24" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: 1.2,
          textTransform: "uppercase", marginBottom: 10 }}>
          Longitudinal Tracking · Cognitive Wellness
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 34, color: "#f0ece3",
          letterSpacing: -1, marginBottom: 8, fontWeight: 400 }}>Progress</h1>
        <p style={{ color: "rgba(240,236,227,0.45)", fontSize: 14, lineHeight: 1.6, maxWidth: 480 }}>
          {hasData
            ? `${history.length} assessment${history.length > 1 ? "s" : ""} recorded. Tracking trends helps identify meaningful changes over time.`
            : "Complete your first assessment to begin tracking your cognitive wellness journey."}
        </p>
      </div>

      {loading && (
        <div style={{ color: "rgba(240,236,227,0.4)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
          Loading your history…
        </div>
      )}

      {err && (
        <div style={{ background: "rgba(232,64,64,0.08)", border: "1px solid rgba(232,64,64,0.2)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 20, color: "#ff7070", fontSize: 13 }}>
          ⚠️ {err}
        </div>
      )}

      {/* ── No data state ── */}
      {!loading && !hasData && (
        <div style={{ background: "#141414", borderRadius: 20, padding: "60px 40px",
          textAlign: "center", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: "#f0ece3", marginBottom: 10 }}>
            No Data Yet
          </div>
          <p style={{ color: "rgba(240,236,227,0.45)", fontSize: 14, lineHeight: 1.7,
            maxWidth: 340, margin: "0 auto 24px" }}>
            Complete your first cognitive assessment to start building your wellness timeline.
          </p>
          {setPage && (
            <button onClick={() => setPage("assessments")}
              style={{ padding: "12px 28px", borderRadius: 12, background: "#e84040",
                border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Start Assessment →
            </button>
          )}
        </div>
      )}

      {!loading && hasData && (
        <>
          {/* ── Overall summary ── */}
          <div style={{ background: "linear-gradient(135deg, #141414, #111)", borderRadius: 20,
            padding: "28px 32px", marginBottom: 20, border: `1px solid ${latestTier.color}18` }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: 0.8,
                  textTransform: "uppercase", marginBottom: 8 }}>Overall Wellness Score</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 64,
                    color: latestTier.color, lineHeight: 1 }}>
                    {latestOverall ?? "—"}
                  </span>
                  <span style={{ color: "rgba(240,236,227,0.3)", fontSize: 18, paddingBottom: 8 }}>/100</span>
                  <TrendBadge data={overallData} />
                </div>
                <div style={{ fontSize: 13, color: latestTier.color, fontWeight: 600, marginTop: 6 }}>
                  {latestTier.label}
                </div>
                {latestComposite != null && (
                  <div style={{ fontSize: 11, color: "rgba(240,236,227,0.3)", marginTop: 4 }}>
                    Composite risk score: {latestComposite}/100 (lower = better)
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", marginBottom: 4 }}>Assessments</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f0ece3" }}>{history.length}</div>
              </div>
            </div>
            <Sparkline data={overallData} color={latestTier.color} height={70} width={600} />
            {labels.length > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 10, color: "rgba(240,236,227,0.25)" }}>{labels[0]}</span>
                <span style={{ fontSize: 10, color: "rgba(240,236,227,0.25)" }}>{labels[labels.length - 1]}</span>
              </div>
            )}
          </div>

          {/* ── Framing note ── */}
          <div style={{ background: "rgba(96,165,250,0.04)", borderRadius: 14,
            border: "1px solid rgba(96,165,250,0.1)", padding: "13px 18px", marginBottom: 24,
            fontSize: 12, color: "rgba(240,236,227,0.5)", lineHeight: 1.65 }}>
            💡 <strong style={{ color: "rgba(240,236,227,0.7)" }}>About score variation:</strong> It's completely normal for scores to fluctuate between sessions.
            Sleep, stress, time of day, and familiarity with the tests all significantly affect results.
            Focus on <em>long-term trends</em> rather than individual session scores.
          </div>

          {/* ── Domain grid ── */}
          <div style={{ fontSize: 11, color: "rgba(240,236,227,0.35)", letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 14 }}>Domain Trends</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
            {domains.slice(0, 3).map(d => <DomainTrack key={d.label} {...d} labels={labels} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
            {domains.slice(3).map(d => <DomainTrack key={d.label} {...d} labels={labels} />)}
          </div>

          {/* ── Score guide ── */}
          <div style={{ background: "#141414", borderRadius: 16, padding: "20px 24px",
            marginBottom: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 13, marginBottom: 14 }}>
              How to read your scores
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { range: "70–100", label: "Healthy Range", color: "#34d399",
                  desc: "Performance within expected norms for your age group." },
                { range: "50–69", label: "Within Variation", color: "#fbbf24",
                  desc: "Some variability detected. Often reflects test conditions, fatigue, or first-time testing." },
                { range: "0–49",  label: "Worth Monitoring", color: "#f87171",
                  desc: "Below typical ranges. Consider retesting and consulting a doctor if persistent." },
              ].map(s => (
                <div key={s.range} style={{ padding: "14px 16px", borderRadius: 12,
                  background: `${s.color}08`, border: `1px solid ${s.color}18` }}>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22,
                    color: s.color, marginBottom: 4 }}>{s.range}</div>
                  <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 12, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(240,236,227,0.45)", lineHeight: 1.55 }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: "rgba(240,236,227,0.3)", lineHeight: 1.6 }}>
              ⚠️ These scores are cognitive performance indicators only. They cannot diagnose any medical condition.
              Consult a qualified healthcare professional for medical evaluation.
            </div>
          </div>

          {/* ── History table ── */}
          <HistoryTable history={history} />

          {/* ── Retake CTA ── */}
          <div style={{ marginTop: 24, padding: "24px 28px", background: "#141414", borderRadius: 16,
            border: "1px solid rgba(232,64,64,0.15)", display: "flex",
            alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 15, marginBottom: 4 }}>
                Ready for your next assessment?
              </div>
              <div style={{ fontSize: 13, color: "rgba(240,236,227,0.45)" }}>
                Retake monthly for the most meaningful trend data.
              </div>
            </div>
            {setPage && (
              <button onClick={() => setPage("assessments")}
                style={{ padding: "12px 24px", borderRadius: 12, background: "#e84040",
                  border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Start Assessment →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
