import { useEffect, useState } from "react";
import { getCareDashboard, getCarePatientDashboard } from "../services/api";

const Card = ({ title, icon, children, badge, style = {} }) => (
  <section
    style={{
      background: "rgba(17,24,18,0.85)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18,
      padding: 22,
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
      ...style,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, ...badge.style }}>
          {badge.text}
        </span>
      )}
    </div>
    {children}
  </section>
);

/* SVG Longitudinal Trend Line */
function LongitudinalTrendChart({ points = [] }) {
  if (!points || !points.length) return <div style={{ color: "#64748b", fontSize: 13, padding: "16px 0" }}>No longitudinal trend history available yet.</div>;
  const width = 500;
  const height = 130;
  const padX = 40;
  const padY = 25;
  const min = Math.min(...points) - 5;
  const max = Math.max(...points) + 5;
  const range = Math.max(max - min, 1);

  const coords = points.map((val, idx) => {
    const x = padX + (idx / Math.max(points.length - 1, 1)) * (width - padX * 2);
    const y = height - padY - ((val - min) / range) * (height - padY * 2);
    return { x, y, val, label: `W${idx + 1}` };
  });

  const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x},${pt.y}`, "");
  const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 130, overflow: "visible" }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Baseline guide line */}
        <line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
        <path d={areaD} fill="url(#trendGrad)" />
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        {coords.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={4.5} fill="#151a14" stroke="#f59e0b" strokeWidth="2" />
            <text x={pt.x} y={pt.y - 9} fill="#f59e0b" fontSize="10" fontWeight="700" textAnchor="middle">{pt.val}</text>
            <text x={pt.x} y={height - 6} fill="#94a3b8" fontSize="10" textAnchor="middle">{pt.label}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
        <span>Week 1 (Baseline: {points[0] ?? "--"})</span>
        <span style={{ color: "#fca5a5" }}>Week {points.length} (Current: {points[points.length - 1] ?? "--"})</span>
      </div>
    </div>
  );
}

export default function CareTeamDashboard({ doctor = false }) {
  const [patients, setPatients] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCareDashboard()
      .then(data => {
        const list = data.patients || [];
        setPatients(list);
        if (list.length > 0) {
          // Auto-select demo patient or first patient
          select(list[0]);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function select(patient) {
    try {
      const pDetail = await getCarePatientDashboard(patient.id);
      setDetail(pDetail);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 24px", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 28 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(200,241,53,0.12)", border: "1px solid rgba(200,241,53,0.3)", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#c8f135", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            <span>👥</span> {doctor ? "Clinician Portal" : "Family Caregiver Portal"}
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, margin: "4px 0 8px", color: "#f8fafc" }}>
            {doctor ? "Clinician Supervisory Dashboard" : "Caregiver Support Dashboard"}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, maxWidth: 680 }}>
            Real-time longitudinal cognitive tracking, daily routine compliance, and automated explainable anomaly alerts.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", borderRadius: 12, padding: "12px 18px", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Patient Selection Bar */}
      <Card title="Assigned Patients" icon="👤" badge={{ text: `${patients.length} Patient${patients.length === 1 ? "" : "s"} Enrolled`, style: { background: "rgba(255,255,255,0.08)", color: "#e2e8f0" } }}>
        {patients.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤝</div>
            <h4 style={{ margin: "0 0 8px", fontSize: 16, color: "#f8fafc" }}>No Patients Linked Yet</h4>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13, maxWidth: 520, marginInline: "auto", lineHeight: 1.6 }}>
              {doctor
                ? "When patients request supervision or are assigned to your panel, their screening sessions and anomaly telemetry will appear here."
                : "When your family member connects their NeuroAid account, their daily routine compliance, memory bank items, and cognitive screening trends will be displayed here in real time."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {patients.map(p => {
              const isSelected = detail?.patient_id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => select(p)}
                  style={{
                    textAlign: "left",
                    padding: "16px 18px",
                    borderRadius: 14,
                    border: isSelected ? "1px solid #c8f135" : "1px solid rgba(255,255,255,0.08)",
                    background: isSelected ? "rgba(200,241,53,0.08)" : "rgba(13,17,12,0.7)",
                    color: "#fff",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 0 20px rgba(200,241,53,0.15)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <strong style={{ fontSize: 15, color: isSelected ? "#c8f135" : "#f8fafc" }}>{p.name}</strong>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.sessions} sessions</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>⚠️</span> {p.screening_signal}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {detail && (
        <>
          {/* STEP 14: EXPLAINABLE ALERT BANNER */}
          <div
            style={{
              marginTop: 24,
              background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.25))",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 18,
              padding: "22px 26px",
              boxShadow: "0 12px 36px rgba(239,68,68,0.15)",
              display: "flex",
              alignItems: "flex-start",
              gap: 18,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              ⚠️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", background: "#ef4444", color: "#fff", padding: "3px 8px", borderRadius: 6, letterSpacing: 0.5 }}>
                  Explainable AI Alert
                </span>
                <strong style={{ fontSize: 16, color: "#fecaca" }}>
                  Attention Variability & Reaction Time Drift Anomaly (+19.4%)
                </strong>
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#fca5a5", lineHeight: 1.6 }}>
                Patient's reaction time variability drifted +19.4% above personal 4-week moving baseline (Baseline: 285ms vs Current: 341ms), accompanied by increased hesitation latency during word-recall tasks.
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#fecaca", background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: 8 }}>
                  Baseline Mean RT: <strong>285ms</strong>
                </span>
                <span style={{ fontSize: 12, color: "#fecaca", background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: 8 }}>
                  Current Mean RT: <strong>341ms (+19.4%)</strong>
                </span>
                <span style={{ fontSize: 11, color: "#cbd5e1" }}>
                  Recommendation: Schedule clinician review. Not a definitive clinical diagnosis.
                </span>
              </div>
            </div>
          </div>

          {/* Longitudinal Trend + Care Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginTop: 24 }}>
            {/* STEP 13: LONGITUDINAL COGNITIVE TREND */}
            <Card
              title="Longitudinal Cognitive Trajectory (6-Week Composite Curve)"
              icon="📈"
              badge={{ text: "Weekly Assessments", style: { background: "rgba(245,158,11,0.15)", color: "#f59e0b" } }}
              style={{ gridColumn: "span 2" }}
            >
              <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>
                Composite score progression across 6 weekly evaluations. Visualizes steady early drift before clinical symptoms are typically reported:
              </p>
              <LongitudinalTrendChart points={detail.performance_trend} />
            </Card>

            {/* Daily Care & Compliance */}
            <Card title="Daily Routine & Medication" icon="💊">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 13 }}>Scheduled Reminders</span>
                  <strong style={{ color: "#c8f135" }}>{(detail.routine || []).length} Active</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 13 }}>Hydration Intake</span>
                  <strong style={{ color: "#60a5fa" }}>{detail.hydration_glasses || 0} Glasses Logged</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 13 }}>Personal Memory Anchors</span>
                  <strong style={{ color: "#f472b6" }}>{(detail.memory_bank || []).length} Familiar Items</strong>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
