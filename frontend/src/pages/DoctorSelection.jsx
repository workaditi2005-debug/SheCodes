import { useState, useEffect } from "react";
import { DarkCard, Btn } from "../components/RiskDashboard";
import { getDoctors, getMyDoctor, enrollWithDoctor } from "../services/api";

const LIME = "#C8F135";
const T_RED = "#e84040";
const T_AMBER = "#f59e0b";
const T_GREEN = "#4ade80";
const T_CREAM = "#f0ece3";
const T_CREAMFAINT = "rgba(240,236,227,0.5)";

export default function DoctorSelection({ setPage }) {
  const [doctors,      setDoctors]      = useState([]);
  const [myDoctor,     setMyDoctor]     = useState(null);
  const [pendingDoc,   setPendingDoc]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [enrolling,    setEnrolling]    = useState(null);
  const [error,        setError]        = useState(null);
  const [success,      setSuccess]      = useState(null);

  async function loadData() {
    try {
      const [list, myData] = await Promise.all([
        getDoctors().catch(() => []),
        getMyDoctor().catch(() => ({ doctor: null, pending_doctor: null })),
      ]);
      setDoctors(list || []);
      setMyDoctor(myData?.doctor || null);
      setPendingDoc(myData?.pending_doctor || null);
    } catch (e) {
      console.warn("DoctorSelection loadData error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleEnroll(doctorId) {
    setEnrolling(doctorId); setError(null); setSuccess(null);
    try {
      await enrollWithDoctor(doctorId);
      setSuccess("Enrollment request sent! Your doctor will review and approve shortly.");
      await loadData();
    } catch (e) {
      setError(e.message || "Failed to send enrollment request.");
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(200,241,53,0.10)", border: `1px solid ${LIME}33`, borderRadius: 99, padding: "5px 14px", marginBottom: 14, fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 1.5, textTransform: "uppercase" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: LIME, display: "inline-block" }} />
          Doctor Enrollment
        </div>
        <h1 style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: "clamp(26px,3vw,42px)", color: "#fff", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 8 }}>
          Choose Your <span style={{ color: LIME }}>Doctor.</span>
        </h1>
        <p style={{ color: "#555", fontSize: 14 }}>Select a neurologist to supervise your assessments. Enrollment requires doctor approval.</p>
      </div>

      {/* Current doctor card */}
      {myDoctor && (
        <DarkCard style={{ padding: 24, marginBottom: 20, border: `1px solid ${LIME}30` }} hover={false}>
          <div style={{ fontSize: 10, color: LIME, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>✓ Your Assigned Doctor</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${LIME}18`, border: `2px solid ${LIME}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: LIME, fontWeight: 700 }}>
              {(myDoctor.full_name?.[0] || "D").toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{myDoctor.full_name}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {myDoctor.specialization || "Neurologist"}{myDoctor.hospital ? ` · ${myDoctor.hospital}` : ""}
                {myDoctor.location ? ` · ${myDoctor.location}` : ""}
              </div>
              {myDoctor.consultation_mode && (
                <span style={{ display: "inline-block", marginTop: 6, background: `${LIME}12`, color: LIME, border: `1px solid ${LIME}22`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                  {myDoctor.consultation_mode} Consultation
                </span>
              )}
            </div>
          </div>
        </DarkCard>
      )}

      {/* Pending approval banner */}
      {pendingDoc && (
        <DarkCard style={{ padding: 20, marginBottom: 20, border: `1px solid ${T_AMBER}30` }} hover={false}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>⏳</span>
            <div>
              <div style={{ fontWeight: 700, color: T_AMBER, fontSize: 14, marginBottom: 2 }}>Enrollment Request Pending</div>
              <div style={{ fontSize: 13, color: "#888" }}>
                Your request to Dr. <strong style={{ color: T_CREAM }}>{pendingDoc.full_name}</strong> is awaiting approval.
              </div>
            </div>
          </div>
        </DarkCard>
      )}

      {success && (
        <div style={{ background: `rgba(200,241,53,0.08)`, border: `1px solid ${LIME}33`, borderRadius: 12, padding: "12px 18px", marginBottom: 16, color: LIME, fontSize: 13 }}>✓ {success}</div>
      )}
      {error && (
        <div style={{ background: "rgba(232,64,64,0.08)", border: "1px solid rgba(232,64,64,0.25)", borderRadius: 12, padding: "12px 18px", marginBottom: 16, color: "#ff7070", fontSize: 13 }}>⚠️ {error}</div>
      )}

      {loading ? (
        <div style={{ color: "#555", fontSize: 14, padding: 40, textAlign: "center" }}>Loading available doctors…</div>
      ) : doctors.length === 0 ? (
        <DarkCard style={{ padding: 56, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🩺</div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: 22, color: "#fff", marginBottom: 10 }}>No Doctors Registered Yet</div>
          <p style={{ color: "#555", fontSize: 14, maxWidth: 360, margin: "0 auto", lineHeight: 1.7 }}>
            Ask your doctor to register on NeuroAid as a Doctor account to appear here.
          </p>
        </DarkCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {doctors.map(doc => {
            const isMine    = myDoctor?.id === doc.id;
            const isPending = pendingDoc?.id === doc.id;
            const isFull    = (doc.current_patients || 0) >= (doc.max_patients || 10);
            const pctFull   = Math.round(((doc.current_patients || 0) / (doc.max_patients || 10)) * 100);

            return (
              <DarkCard key={doc.id} style={{ padding: 24, border: `1px solid ${isMine ? LIME+"30" : isPending ? T_AMBER+"25" : "rgba(255,255,255,0.07)"}`, opacity: isFull && !isMine && !isPending ? 0.6 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flex: 1, minWidth: 0 }}>
                    {/* Avatar */}
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#60a5fa", fontWeight: 700, flexShrink: 0 }}>
                      {(doc.full_name?.[0] || "D").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{doc.full_name}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {doc.specialization || "Neurologist"}
                        {doc.hospital ? ` · ${doc.hospital}` : ""}
                        {doc.location ? ` · ${doc.location}` : ""}
                        {doc.years_experience ? ` · ${doc.years_experience} yrs` : ""}
                      </div>
                      {doc.consultation_mode && (
                        <span style={{ display: "inline-block", marginTop: 5, background: "rgba(96,165,250,0.10)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 600 }}>
                          {doc.consultation_mode} Consult
                        </span>
                      )}
                      {/* Capacity bar */}
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ height: 4, width: 90, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                          <div style={{ height: "100%", width: `${pctFull}%`, background: isFull ? T_RED : LIME, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: isFull ? T_RED : "#888" }}>
                          {doc.current_patients || 0}/{doc.max_patients || 10} patients
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div style={{ flexShrink: 0, marginLeft: 10 }}>
                    {isMine ? (
                      <span style={{ background: `${LIME}14`, color: LIME, border: `1px solid ${LIME}33`, borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>✓ Your Doctor</span>
                    ) : isPending ? (
                      <span style={{ background: `${T_AMBER}12`, color: T_AMBER, border: `1px solid ${T_AMBER}30`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>⏳ Pending</span>
                    ) : isFull ? (
                      <span style={{ background: "rgba(248,113,113,0.10)", color: T_RED, border: "1px solid rgba(248,113,113,0.25)", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>Full</span>
                    ) : (
                      <button onClick={() => handleEnroll(doc.id)} disabled={enrolling === doc.id} style={{ background: LIME, color: "#0a0a0a", border: "none", borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                        {enrolling === doc.id ? "Sending…" : "Request →"}
                      </button>
                    )}
                  </div>
                </div>

                {doc.bio && (
                  <p style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#666", lineHeight: 1.6 }}>{doc.bio}</p>
                )}
              </DarkCard>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: 24, background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 12, padding: "14px 18px", fontSize: 12, color: "rgba(96,165,250,0.8)", lineHeight: 1.6 }}>
        ℹ️ After sending a request, your doctor must approve it. Once approved, your doctor can view your assessment results and neural pattern data.
      </div>
    </div>
  );
}
