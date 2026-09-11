import { useState, useEffect } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, MiniChart } from "../components/RiskDashboard";
import { getPatients, getUser, getPendingRequests, approvePatient } from "../services/api";

const LIME = "#C8F135";

function riskColor(level) {
  return level === "High" ? T.red : level === "Moderate" ? T.amber : level === "Low" ? T.green : "#444";
}

function topRisk(p) {
  const r = p.lastResult;
  if (!r) return null;
  const levels = [r.risk_levels?.alzheimers, r.risk_levels?.dementia, r.risk_levels?.parkinsons];
  if (levels.includes("High"))     return "High";
  if (levels.includes("Moderate")) return "Moderate";
  return "Low";
}

export default function DoctorHome({ setPage, setSelectedPatient }) {
  const [patients,         setPatients]         = useState([]);
  const [pendingRequests,  setPendingRequests]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [actionLoading,    setActionLoading]    = useState(null);
  const [actionStatus,     setActionStatus]     = useState(null);
  const [loadError,        setLoadError]        = useState(null);
  const doctor = getUser();

  async function loadData() {
    setLoadError(null);
    try {
      const [listResult, pendingResult] = await Promise.allSettled([
        getPatients(),
        getPendingRequests(),
      ]);

      if (listResult.status === "fulfilled") {
        setPatients(listResult.value || []);
      } else {
        console.warn("Failed to load patient list:", listResult.reason);
      }

      if (pendingResult.status === "fulfilled") {
        setPendingRequests(pendingResult.value || []);
      } else {
        console.warn("Failed to load pending requests:", pendingResult.reason);
        setPendingRequests([]);
        setLoadError(pendingResult.reason?.message || "Failed to load pending requests.");
      }
    } catch (e) {
      setPatients([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(patientId, action) {
    setActionLoading(patientId + action);
    setActionStatus(null);
    try {
      const data = await approvePatient(patientId, action);
      setActionStatus({
        type: "success",
        text: data?.message || (action === "approve" ? "Patient approved successfully." : "Request rejected."),
      });
      await loadData();
    } catch (e) {
      setActionStatus({
        type: "error",
        text: e.message || "Action failed. Please try again.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => { loadData(); }, []);

  const withResults = patients.filter(p => p.lastResult);
  const highRisk    = patients.filter(p => topRisk(p) === "High");
  const modRisk     = patients.filter(p => topRisk(p) === "Moderate");
  const noTest      = patients.filter(p => !p.lastResult);

  // Averages across all patients who have results
  const avg = (key) => withResults.length === 0 ? 0
    : Math.round(withResults.reduce((s, p) => s + (p.lastResult[key] || 0) * 100, 0) / withResults.length);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(200,241,53,0.10)`, border: `1px solid ${LIME}33`, borderRadius: 99, padding: "5px 14px", marginBottom: 14, fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 1.5, textTransform: "uppercase" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: LIME, display: "inline-block" }} />
          Clinical Overview
        </div>
        <h1 style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: "clamp(28px,3.5vw,44px)", color: "#fff", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 8 }}>
          Welcome, Dr. <span style={{ color: LIME }}>{doctor?.full_name?.split(" ")[0] || "Doctor"}.</span>
        </h1>
        <p style={{ color: "#555", fontSize: 14 }}>
          {patients.length} registered patient{patients.length !== 1 ? "s" : ""} · {withResults.length} with assessment data
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#555", fontSize: 14, padding: 40, textAlign: "center" }}>Loading…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Patients",   val: patients.length,     icon: "👥", c: T.cream  },
              { label: "⚠️ High Risk",     val: highRisk.length,     icon: "●",  c: T.red    },
              { label: "Moderate Risk",    val: modRisk.length,      icon: "●",  c: T.amber   },
              { label: "Pending Test",     val: noTest.length,       icon: "⏳", c: "#555"   },
            ].map(s => (
              <DarkCard key={s.label} style={{ padding: 22 }}>
                <div style={{ fontSize: 18, color: s.c, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: 40, color: s.c === T.cream ? "#fff" : s.c, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: T.creamFaint, marginTop: 6 }}>{s.label}</div>
              </DarkCard>
            ))}
          </div>

          {/* ── Load Error Banner ── */}
          {loadError && (
            <div style={{
              marginBottom: 20,
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: T.amber,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚠️</span>
                <span>{loadError}</span>
              </div>
              <button
                onClick={loadData}
                style={{
                  background: "rgba(245,158,11,0.18)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  color: T.cream,
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Pending Enrollment Requests ── */}
          {(pendingRequests.length > 0 || actionStatus) && (
            <DarkCard style={{ padding: 24, marginBottom: 20, border: "1px solid rgba(245,158,11,0.25)" }} hover={false}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: pendingRequests.length > 0 ? 16 : 10 }}>
                <div style={{ fontWeight: 700, color: T.amber, fontSize: 14 }}>
                  ⏳ Pending Enrollment Requests ({pendingRequests.length})
                </div>
                {pendingRequests.length === 0 && (
                  <button
                    onClick={() => setActionStatus(null)}
                    style={{ background: "none", border: "none", color: T.creamFaint, fontSize: 12, cursor: "pointer" }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
              {actionStatus && (
                <div style={{
                  marginBottom: pendingRequests.length > 0 ? 12 : 0,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: actionStatus.type === "success" ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.10)",
                  border: `1px solid ${actionStatus.type === "success" ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.3)"}`,
                  color: actionStatus.type === "success" ? T.green : T.red,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <span>{actionStatus.type === "success" ? "✓" : "⚠️"}</span>
                  <span>{actionStatus.text}</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendingRequests.map(req => (
                  <div key={req.patient_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: T.cream, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {(req.patient_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: T.cream, fontSize: 14 }}>{req.patient_name}</div>
                      <div style={{ fontSize: 12, color: T.creamFaint }}>{req.patient_email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleApproval(req.patient_id, "approve")}
                        disabled={!!actionLoading}
                        style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: T.green, color: "#0a0a0a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: actionLoading === req.patient_id + "approve" ? 0.6 : 1 }}
                      >
                        {actionLoading === req.patient_id + "approve" ? "…" : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => handleApproval(req.patient_id, "reject")}
                        disabled={!!actionLoading}
                        style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid rgba(232,64,64,0.3)", background: "transparent", color: T.red, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: actionLoading === req.patient_id + "reject" ? 0.6 : 1 }}
                      >
                        {actionLoading === req.patient_id + "reject" ? "…" : "✕ Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DarkCard>
          )}

          {/* Average neural pattern anomaly scores across all patients */}
          {withResults.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { key: "alzheimers_risk", label: "Avg. Memory Deviation Index", color: "#a78bfa" },
                { key: "dementia_risk",   label: "Avg. Executive Drift Score",  color: T.amber   },
                { key: "parkinsons_risk", label: "Avg. Motor Anomaly Index",    color: T.blue    },
              ].map(d => {
                const pct = avg(d.key);
                return (
                  <DarkCard key={d.key} style={{ padding: 22, border: `1px solid ${d.color}20` }}>
                    <div style={{ fontSize: 11, color: T.creamFaint, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{d.label}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: 44, color: d.color, lineHeight: 1, marginBottom: 10 }}>
                      {pct}<span style={{ fontSize: 16, color: "#555" }}>%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: d.color, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>across {withResults.length} assessed patient{withResults.length !== 1 ? "s" : ""}</div>
                  </DarkCard>
                );
              })}
            </div>
          )}

          {/* High risk patients — urgent attention */}
          {highRisk.length > 0 && (
            <DarkCard style={{ padding: 24, marginBottom: 20, border: `1px solid ${T.red}25` }} hover={false}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: T.red, fontSize: 14 }}>⚠️ High Risk Patients — Needs Attention</div>
                <Btn small onClick={() => setPage("patients")}>View All →</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {highRisk.map(p => {
                  const last = p.lastResult;
                  return (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPage("patient-detail"); }}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(232,64,64,0.06)", border: "1px solid rgba(232,64,64,0.15)", cursor: "pointer" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.red}18`, border: `1px solid ${T.red}44`, display: "flex", alignItems: "center", justifyContent: "center", color: T.cream, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {(p.full_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: T.cream, fontSize: 14 }}>{p.full_name}</div>
                        <div style={{ fontSize: 12, color: T.creamFaint }}>{p.email}</div>
                      </div>
                      {last && (
                        <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.creamFaint }}>
                          <span>Mem: <strong style={{ color: "#a78bfa" }}>{Math.round((last.alzheimers_risk || 0) * 100)}%</strong></span>
                          <span>Exec: <strong style={{ color: T.amber }}>{Math.round((last.dementia_risk || 0) * 100)}%</strong></span>
                          <span>Motor: <strong style={{ color: T.blue }}>{Math.round((last.parkinsons_risk || 0) * 100)}%</strong></span>
                        </div>
                      )}
                      <span style={{ color: T.red, fontSize: 13, fontWeight: 700 }}>View →</span>
                    </div>
                  );
                })}
              </div>
            </DarkCard>
          )}

          {/* Patients awaiting first test */}
          {noTest.length > 0 && (
            <DarkCard style={{ padding: 24, border: "1px solid rgba(255,255,255,0.07)" }} hover={false}>
              <div style={{ fontWeight: 700, color: T.creamFaint, fontSize: 14, marginBottom: 14 }}>⏳ Awaiting First Assessment</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {noTest.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontWeight: 700, fontSize: 12 }}>
                      {(p.full_name?.[0] || "?").toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, color: T.creamFaint }}>{p.full_name}</span>
                  </div>
                ))}
              </div>
            </DarkCard>
          )}

          {patients.length === 0 && (
            <DarkCard style={{ padding: 56, textAlign: "center" }} hover={false}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>👥</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: 22, color: "#fff", marginBottom: 10 }}>No patients yet</div>
              <p style={{ color: "#555", fontSize: 14, maxWidth: 380, margin: "0 auto", lineHeight: 1.7 }}>
                Share the NeuroAid app with your patients so they can register and complete cognitive assessments.
              </p>
            </DarkCard>
          )}
        </>
      )}
    </div>
  );
}