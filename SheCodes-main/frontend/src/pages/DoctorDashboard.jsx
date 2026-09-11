import { useState, useEffect } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Badge } from "../components/RiskDashboard";
import { getPatients, getUser } from "../services/api";

export default function DoctorDashboard({ setPage, setSelectedPatient }) {
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("All");
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const doctor = getUser();

  useEffect(() => {
    getPatients()
      .then(list => setPatients(list || []))
      .catch(err => setError(err.message || "Failed to load patients."))
      .finally(() => setLoading(false));
  }, []);

  // Derive top risk level from patient's last assessment
  function topRisk(p) {
    const r = p.lastResult;
    if (!r) return "No data";
    const levels = [r.risk_levels?.alzheimers, r.risk_levels?.dementia, r.risk_levels?.parkinsons];
    if (levels.includes("High"))     return "High";
    if (levels.includes("Moderate")) return "Moderate";
    return "Low";
  }

  const filtered = patients.filter(p =>
    (filter === "All" || topRisk(p) === filter || (filter === "No data" && !p.lastResult)) &&
    (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const riskColor = r => r === "High" ? T.red : r === "Moderate" ? T.amber : r === "Low" ? T.green : "#444";

  const counts = {
    total:   patients.length,
    high:    patients.filter(p => topRisk(p) === "High").length,
    moderate:patients.filter(p => topRisk(p) === "Moderate").length,
    low:     patients.filter(p => topRisk(p) === "Low").length,
    noData:  patients.filter(p => !p.lastResult).length,
  };

  return (
    <div>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, letterSpacing: -1, marginBottom: 6 }}>Doctor Dashboard</h1>
        <p style={{ color: T.creamFaint, fontSize: 14 }}>
          Welcome, Dr. {doctor?.full_name || "Doctor"} · {counts.total} registered patient{counts.total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Patients", val: counts.total,    icon: "👥", c: T.cream  },
          { label: "High Risk",      val: counts.high,     icon: "●",  c: T.red    },
          { label: "Moderate",       val: counts.moderate, icon: "●",  c: T.amber   },
          { label: "Low Risk",       val: counts.low,      icon: "●",  c: T.green  },
        ].map(s => (
          <DarkCard key={s.label} style={{ padding: 20 }}>
            <div style={{ fontSize: 20, color: s.c, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: T.creamFaint, marginTop: 4 }}>{s.label}</div>
          </DarkCard>
        ))}
      </div>

      {/* Search & filter */}
      <DarkCard style={{ padding: 16, marginBottom: 14 }} hover={false}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients by name…"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.cardBorder}`, background: T.bg3, fontSize: 13, color: T.cream, outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
          {["All", "High", "Moderate", "Low", "No data"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 14px", borderRadius: 50, border: `1px solid ${filter === f ? T.red : T.cardBorder}`, background: filter === f ? "rgba(232,64,64,0.15)" : "transparent", color: filter === f ? T.red : T.creamFaint, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" }}>{f}</button>
          ))}
        </div>
      </DarkCard>

      {/* Patient table */}
      <DarkCard style={{ padding: 0, overflow: "hidden" }} hover={false}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: T.creamFaint, fontSize: 14 }}>Loading patients…</div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: "center", color: T.red, fontSize: 14 }}>⚠️ {error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: T.creamFaint, fontSize: 14 }}>
            {patients.length === 0
              ? "No patients have registered yet. Share the app with your patients!"
              : "No patients match your filter."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                {["Patient", "Age", "Overall Risk", "Mem. Deviation", "Exec. Drift", "Motor Anomaly", "Sessions", "Last Active", ""].map(h => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: T.creamFaint, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const risk      = topRisk(p);
                const last      = p.lastResult;
                const regDate   = p.created_at  ? new Date(p.created_at).toLocaleDateString("en-US",  { month: "short", day: "numeric" }) : "—";
                const lastActive= p.last_login  ? new Date(p.last_login).toLocaleDateString("en-US",  { month: "short", day: "numeric" }) : "—";

                const diseaseProb = (key) => last ? `${Math.round((last[`${key}_risk`] || 0) * 100)}%` : "—";
                const diseaseLevel= (key) => last?.risk_levels?.[key] || null;
                const dlColor = (key) => { const l = diseaseLevel(key); return l === "High" ? T.red : l === "Moderate" ? T.amber : l === "Low" ? T.green : "#444"; };

                return (
                  <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.cardBorder}` : "none", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${riskColor(risk)}18`, border: `1px solid ${riskColor(risk)}44`, display: "flex", alignItems: "center", justifyContent: "center", color: T.cream, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                          {(p.full_name?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: T.cream, fontSize: 13 }}>{p.full_name}</div>
                          <div style={{ fontSize: 10, color: T.creamFaint }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: T.creamFaint, fontSize: 13 }}>{p.age || "—"}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {last
                        ? <span style={{ background: `${riskColor(risk)}18`, color: riskColor(risk), padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${riskColor(risk)}33` }}>{risk}</span>
                        : <span style={{ color: "#444", fontSize: 12 }}>No test yet</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ color: dlColor("alzheimers"), fontWeight: 700, fontSize: 13 }}>{diseaseProb("alzheimers")}</span>
                      {diseaseLevel("alzheimers") && <span style={{ color: dlColor("alzheimers"), fontSize: 10, marginLeft: 4 }}>({diseaseLevel("alzheimers")})</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ color: dlColor("dementia"), fontWeight: 700, fontSize: 13 }}>{diseaseProb("dementia")}</span>
                      {diseaseLevel("dementia") && <span style={{ color: dlColor("dementia"), fontSize: 10, marginLeft: 4 }}>({diseaseLevel("dementia")})</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ color: dlColor("parkinsons"), fontWeight: 700, fontSize: 13 }}>{diseaseProb("parkinsons")}</span>
                      {diseaseLevel("parkinsons") && <span style={{ color: dlColor("parkinsons"), fontSize: 10, marginLeft: 4 }}>({diseaseLevel("parkinsons")})</span>}
                    </td>
                    <td style={{ padding: "14px 16px", color: T.creamFaint, fontSize: 13 }}>{p.sessionCount ?? 0}</td>
                    <td style={{ padding: "14px 16px", color: T.creamFaint, fontSize: 13 }}>{lastActive}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <Btn small variant="ghost" onClick={() => { setSelectedPatient(p); setPage("patient-detail"); }}>View →</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DarkCard>
    </div>
  );
}