import { useState, useEffect, useRef } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Badge, MiniChart } from "../components/RiskDashboard";
import { getUser, getMyResults, getDoctors } from "../services/api";
import { useAssessment } from "../context/AssessmentContext";
import { submitAnalysis } from "../services/api";
import { useI18n } from "../i18n/LanguageContext";

const LIME = "#C8F135";
const RED  = "#e84040";
const AMB  = "#f59e0b";
const BLU  = "#60a5fa";
const PUR  = "#a78bfa";

/* ─────────────────────────────────────────────
   helpers
───────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

async function apiFetch(path, method = "GET", body = null) {
  const token = sessionStorage.getItem("neuroaid_token");
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Request failed"); }
  return res.json();
}

/* ─────────────────────────────────────────────
   Collapsible Section wrapper
───────────────────────────────────────────── */
function CollapsibleSection({ title, icon, badge, badgeColor = AMB, defaultOpen = false, children, accentColor = LIME }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(defaultOpen ? "auto" : 0);

  useEffect(() => {
    if (open) {
      setHeight(contentRef.current?.scrollHeight + "px");
      const t = setTimeout(() => setHeight("auto"), 350);
      return () => clearTimeout(t);
    } else {
      setHeight(contentRef.current?.scrollHeight + "px");
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight(0)));
    }
  }, [open]);

  return (
    <div style={{ marginBottom: 14, borderRadius: 18, border: `1px solid ${open ? accentColor + "28" : "rgba(255,255,255,0.07)"}`, overflow: "hidden", background: "#111", transition: "border-color 0.3s" }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif" }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 800, color: "#fff", fontSize: 15, letterSpacing: "-0.3px" }}>{title}</span>
        {badge != null && (
          <span style={{ background: `${badgeColor}18`, color: badgeColor, border: `1px solid ${badgeColor}30`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
            {badge}
          </span>
        )}
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18, transition: "transform 0.3s", transform: open ? "rotate(90deg)" : "none", flexShrink: 0 }}>›</span>
      </button>

      {/* Animated body */}
      <div ref={contentRef} style={{ height, overflow: "hidden", transition: "height 0.32s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ padding: "0 22px 22px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Inline Assessment Panel
───────────────────────────────────────────── */
function AssessmentPanel({ setPage }) {
  const {
    speechData, memoryData, reactionData, stroopData, tapData,
    setApiResult, setLoading: setCtxLoading, setError: setCtxError,
    loading, error, completedCount,
  } = useAssessment();

  const tests = [
    { id: "speech",   icon: "🎙️", title: "Speech Analysis",  desc: "WPM, pauses, rhythm",          dur: "~2 min", accent: RED,  done: !!speechData   },
    { id: "memory",   icon: "🧠", title: "Memory Test",       desc: "Recall, latency, intrusions",  dur: "~3 min", accent: BLU,  done: !!memoryData   },
    { id: "reaction", icon: "⚡", title: "Reaction Time",     desc: "Speed, drift, misses",          dur: "~2 min", accent: AMB,  done: !!reactionData },
    { id: "stroop",   icon: "🎨", title: "Stroop Test",       desc: "Color-word interference",       dur: "~2 min", accent: PUR,  done: !!stroopData   },
    { id: "tap",      icon: "🥁", title: "Motor Tap Test",    desc: "Rhythmic motor control",        dur: "~1 min", accent: LIME, done: !!tapData      },
  ];

  const allDone = completedCount >= 5;
  const pct     = (completedCount / 5) * 100;

  async function handleSubmit() {
    setCtxLoading(true); setCtxError(null);
    try {
      const payload = {
        speech_audio:   speechData?.audio_b64 || null,
        memory_results: { word_recall_accuracy: memoryData?.word_recall_accuracy ?? 50, pattern_accuracy: memoryData?.pattern_accuracy ?? 50 },
        reaction_times: reactionData?.times ?? [],
        speech:   speechData   ? { wpm: speechData.wpm, speed_deviation: speechData.speed_deviation, speech_speed_variability: speechData.speech_speed_variability, pause_ratio: speechData.pause_ratio, completion_ratio: speechData.completion_ratio, restart_count: speechData.restart_count, speech_start_delay: speechData.speech_start_delay } : null,
        memory:   memoryData   ? { word_recall_accuracy: memoryData.word_recall_accuracy, pattern_accuracy: memoryData.pattern_accuracy, delayed_recall_accuracy: memoryData.delayed_recall_accuracy, recall_latency_seconds: memoryData.recall_latency_seconds, order_match_ratio: memoryData.order_match_ratio, intrusion_count: memoryData.intrusion_count } : null,
        reaction: reactionData ? { times: reactionData.times, miss_count: reactionData.miss_count, initiation_delay: reactionData.initiation_delay ?? null } : null,
        stroop:   stroopData   ? { total_trials: stroopData.total_trials, error_count: stroopData.error_count, mean_rt: stroopData.mean_rt, incongruent_rt: stroopData.incongruent_rt } : null,
        tap:      tapData      ? { intervals: tapData.intervals, tap_count: tapData.tap_count } : null,
      };
      const result = await submitAnalysis(payload);
      setApiResult(result);
      setPage("results");
    } catch (e) { setCtxError(e.message); }
    finally { setCtxLoading(false); }
  }

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "#666", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>Session Progress</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: allDone ? LIME : "#fff" }}>
            {completedCount} <span style={{ color: "#444", fontWeight: 400 }}>/ 5 tests</span>
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${LIME},#9ABF28)`, borderRadius: 2, transition: "width 0.6s ease", boxShadow: pct > 0 ? `0 0 10px ${LIME}44` : "none" }} />
        </div>
        {allDone && <div style={{ marginTop: 6, fontSize: 11, color: LIME, fontWeight: 700 }}>✓ All tests complete — ready to submit</div>}
      </div>

      {/* Inline test rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {tests.map(t => (
          <div
            key={t.id}
            onClick={loading ? undefined : () => setPage(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: t.done ? "rgba(200,241,53,0.05)" : "rgba(255,255,255,0.03)", border: `1px solid ${t.done ? LIME + "25" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", transition: "all 0.18s" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = t.done ? "rgba(200,241,53,0.09)" : "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.done ? "rgba(200,241,53,0.05)" : "rgba(255,255,255,0.03)"; }}
          >
            {/* Icon */}
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.accent}14`, border: `1px solid ${t.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
              {t.icon}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 13, lineHeight: 1.2 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{t.desc} · {t.dur}</div>
            </div>
            {/* Status */}
            {t.done ? (
              <span style={{ background: `${LIME}12`, border: `1px solid ${LIME}33`, color: LIME, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✓ Done</span>
            ) : (
              <span style={{ color: t.accent, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Start →</span>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(232,64,64,0.08)", border: "1px solid rgba(232,64,64,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#ff7070", fontSize: 13 }}>⚠️ {error}</div>
      )}

      {/* Smart submit button */}
      <button
        onClick={allDone ? handleSubmit : undefined}
        disabled={loading}
        style={{
          width: "100%", padding: "13px 20px", borderRadius: 14,
          border: "none", cursor: allDone ? "pointer" : "default",
          fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 14,
          transition: "all 0.25s",
          background: completedCount === 0
            ? "rgba(255,255,255,0.05)"
            : allDone
              ? `linear-gradient(90deg,${LIME},#9ABF28)`
              : "rgba(255,255,255,0.08)",
          color: completedCount === 0 ? "#444" : allDone ? "#0a0a0a" : "#fff",
          boxShadow: allDone ? `0 0 20px ${LIME}44` : "none",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? "⏳ Analyzing 18 features…"
          : completedCount === 0
            ? "Complete tests to unlock analysis"
            : allDone
              ? "🧠 Submit & Get Neural Pattern Analysis →"
              : `Complete ${5 - completedCount} more test${5 - completedCount > 1 ? "s" : ""} to submit`}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Inline Doctor Panel
───────────────────────────────────────────── */
const SPEC_FILTERS = ["All", "Neurology", "Geriatrics", "Neuropsychology", "Psychiatry", "Other"];

function DoctorPanel() {
  const [doctors,      setDoctors]      = useState([]);
  const [myDoctor,     setMyDoctor]     = useState(null);
  const [pendingId,    setPendingId]    = useState(null);
  const [filter,       setFilter]       = useState("All");
  const [enrolling,    setEnrolling]    = useState(null);
  const [loadingDocs,  setLoadingDocs]  = useState(true);
  const [msg,          setMsg]          = useState(null);

  async function loadDoctors() {
    setLoadingDocs(true);
    try {
      const [list, myData] = await Promise.all([
        getDoctors(),
        apiFetch("/auth/doctors/my-doctor"),
      ]);
      setDoctors(list || []);
      setMyDoctor(myData?.doctor || null);
      setPendingId(myData?.pending_doctor?.id || null);
    } catch (e) {
      setDoctors([]);
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => { loadDoctors(); }, []);

  async function handleEnroll(doctorId) {
    setEnrolling(doctorId); setMsg(null);
    try {
      await apiFetch("/auth/doctors/enroll", "POST", { doctor_id: doctorId });
      setPendingId(doctorId);
      setMsg("Request sent! Waiting for doctor approval.");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setEnrolling(null);
    }
  }

  // If already has a doctor, show profile card
  if (myDoctor) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: `${LIME}08`, border: `1px solid ${LIME}22` }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: `${LIME}18`, border: `2px solid ${LIME}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: LIME, fontWeight: 800, flexShrink: 0 }}>
            {(myDoctor.full_name?.[0] || "D").toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{myDoctor.full_name}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
              {myDoctor.specialization || "Neurologist"}{myDoctor.hospital ? ` · ${myDoctor.hospital}` : ""}{myDoctor.location ? ` · ${myDoctor.location}` : ""}
            </div>
            {myDoctor.consultation_mode && (
              <span style={{ display: "inline-block", marginTop: 4, background: "rgba(96,165,250,0.10)", color: BLU, border: "1px solid rgba(96,165,250,0.2)", borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 600 }}>
                {myDoctor.consultation_mode} Consult
              </span>
            )}
          </div>
          <span style={{ background: `${LIME}14`, color: LIME, border: `1px solid ${LIME}33`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>✓ Active</span>
        </div>
        <p style={{ marginTop: 10, fontSize: 11, color: "#555", lineHeight: 1.6 }}>Your doctor has access to your assessment data and neural pattern reports.</p>
      </div>
    );
  }

  const filtered = filter === "All" ? doctors : doctors.filter(d => (d.specialization || "").toLowerCase() === filter.toLowerCase());

  return (
    <div>
      {msg && (
        <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 10, background: msg.includes("sent") ? `${LIME}08` : "rgba(232,64,64,0.08)", border: `1px solid ${msg.includes("sent") ? LIME + "22" : "rgba(232,64,64,0.2)"}`, color: msg.includes("sent") ? LIME : "#ff7070", fontSize: 12 }}>
          {msg.includes("sent") ? "✓ " : "⚠️ "}{msg}
        </div>
      )}

      {/* Specialty filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {SPEC_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${filter === f ? LIME + "44" : "rgba(255,255,255,0.10)"}`, background: filter === f ? `${LIME}12` : "transparent", color: filter === f ? LIME : "#666", fontSize: 11, fontWeight: filter === f ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {loadingDocs ? (
        <div style={{ color: "#555", fontSize: 13, padding: "16px 0", textAlign: "center" }}>Loading doctors…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#444", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
          {doctors.length === 0 ? "No doctors have registered yet." : `No doctors found for "${filter}"`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(doc => {
            const isFull    = (doc.current_patients || 0) >= (doc.max_patients || 10);
            const isPending = pendingId === doc.id;
            const pct       = Math.round(((doc.current_patients || 0) / (doc.max_patients || 10)) * 100);

            return (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${isPending ? AMB + "25" : "rgba(255,255,255,0.06)"}`, opacity: isFull && !isPending ? 0.6 : 1 }}>
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: BLU, fontWeight: 800, flexShrink: 0 }}>
                  {(doc.full_name?.[0] || "D").toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>{doc.full_name}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>
                    {doc.specialization || "Neurologist"}{doc.hospital ? ` · ${doc.hospital}` : ""}
                  </div>
                  {/* Capacity bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                    <div style={{ height: 3, width: 60, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: isFull ? RED : LIME, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: isFull ? RED : "#555" }}>{doc.current_patients || 0}/{doc.max_patients || 10}</span>
                  </div>
                </div>
                {/* Action */}
                <div style={{ flexShrink: 0 }}>
                  {isPending ? (
                    <span style={{ background: `${AMB}12`, color: AMB, border: `1px solid ${AMB}30`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>⏳ Requested</span>
                  ) : isFull ? (
                    <span style={{ background: "rgba(232,64,64,0.10)", color: RED, border: "1px solid rgba(232,64,64,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>Full</span>
                  ) : (
                    <button onClick={() => handleEnroll(doc.id)} disabled={enrolling === doc.id} style={{ background: LIME, color: "#0a0a0a", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap", opacity: enrolling === doc.id ? 0.6 : 1 }}>
                      {enrolling === doc.id ? "…" : "Request →"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 12, fontSize: 11, color: "#444", lineHeight: 1.6 }}>
        ℹ️ Enrollment requires doctor approval. Once approved, your doctor can monitor your neural pattern data.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
export default function UserDashboard({ setPage }) {
  const { t } = useI18n();
  const user      = getUser();
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [doctorInfo, setDoctorInfo] = useState({ doctor: null, pending_doctor: null });

  const { completedCount } = useAssessment();

  useEffect(() => {
    getMyResults()
      .then(r => setResults(r || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));

    apiFetch("/auth/doctors/my-doctor")
      .then(d => setDoctorInfo(d))
      .catch(() => {});
  }, []);

  const last    = results.length > 0 ? results[results.length - 1] : null;
  const hasData = !!last;

  const domains = hasData ? [
    { label: t("speechDomain", "Speech"),    v: Math.round(last.speech_score),    color: RED  },
    { label: t("memoryDomain", "Memory"),    v: Math.round(last.memory_score),    color: BLU  },
    { label: t("reactionDomain", "Reaction"),  v: Math.round(last.reaction_score),  color: AMB  },
    { label: t("executiveDomain", "Executive"), v: Math.round(last.executive_score), color: PUR  },
    { label: t("motorDomain", "Motor"),     v: Math.round(last.motor_score),     color: LIME },
  ] : [];

  const overallScore = hasData ? Math.round(domains.reduce((s, d) => s + d.v, 0) / domains.length) : null;

  const chartData = results.slice(-7).map(r =>
    Math.round([r.speech_score, r.memory_score, r.reaction_score, r.executive_score, r.motor_score].reduce((a, b) => a + b, 0) / 5)
  );
  while (chartData.length < 7) chartData.unshift(null);

  const lastDate   = last ? new Date(last.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const riskLevel  = hasData ? (Object.values(last.risk_levels || {}).includes("High") ? "High" : Object.values(last.risk_levels || {}).includes("Moderate") ? "Moderate" : "Low") : null;

  // Badge for doctor section
  const doctorBadge = doctorInfo.pending_doctor ? "1 pending" : doctorInfo.doctor ? null : null;
  const doctorBadgeColor = doctorInfo.pending_doctor ? AMB : LIME;

  // Assessment section defaults open if no data, closed if they have results
  const assessDefaultOpen = !hasData;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(200,241,53,0.10)`, border: `1px solid ${LIME}33`, borderRadius: 99, padding: "5px 14px", marginBottom: 14, fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 1.5, textTransform: "uppercase" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: LIME, display: "inline-block", animation: "pulse-dot 2s infinite" }} />
          Cognitive Overview
        </div>
        <h1 style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: "clamp(28px,3.5vw,48px)", color: "#fff", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 8 }}>
          {greeting()}, <span style={{ color: LIME }}>{firstName}.</span>
        </h1>
        <p style={{ color: "#555", fontSize: 14, fontWeight: 500 }}>
          {hasData
            ? `Last assessment ${lastDate} · ${results.length} session${results.length > 1 ? "s" : ""} completed`
            : "No assessments yet — take your first test to see your results"}
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#555", fontSize: 14, padding: 40, textAlign: "center" }}>Loading your results…</div>
      ) : (
        <>
          {/* ── Collapsible: Assessments ── */}
          <CollapsibleSection
            title="Cognitive Assessments"
            icon="🧠"
            badge={completedCount > 0 ? `${completedCount}/5` : null}
            badgeColor={completedCount === 5 ? LIME : AMB}
            defaultOpen={assessDefaultOpen}
            accentColor={LIME}
          >
            <AssessmentPanel setPage={setPage} />
          </CollapsibleSection>

          {/* ── Collapsible: My Doctor ── */}
          <CollapsibleSection
            title="My Doctor"
            icon="🩺"
            badge={doctorBadge}
            badgeColor={doctorBadgeColor}
            defaultOpen={false}
            accentColor={BLU}
          >
            <DoctorPanel />
          </CollapsibleSection>

          {/* ── Results (only if data exists) ── */}
          {hasData && (
            <>
              {/* Top row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Score card */}
                <DarkCard style={{ padding: 36 }} hover={false}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>Overall Cognitive Score</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 20 }}>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: 100, color: "#fff", lineHeight: 1, letterSpacing: "-5px" }}>{overallScore}</span>
                    <div style={{ paddingBottom: 18 }}>
                      {results.length >= 2 && (() => {
                        const prev = results[results.length - 2];
                        const prevScore = Math.round([prev.speech_score, prev.memory_score, prev.reaction_score, prev.executive_score, prev.motor_score].reduce((a, b) => a + b, 0) / 5);
                        const diff = overallScore - prevScore;
                        return diff !== 0 ? (
                          <>
                            <div style={{ color: diff > 0 ? LIME : RED, fontSize: 14, fontWeight: 700 }}>{diff > 0 ? "↑" : "↓"} {Math.abs(diff)} pts</div>
                            <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>vs last session</div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <Badge level={riskLevel} />
                  <div style={{ marginTop: 24 }}>
                    <MiniChart data={chartData.filter(Boolean)} color={LIME} height={60} />
                  </div>
                </DarkCard>

                {/* Domain scores */}
                <DarkCard style={{ padding: 28 }} hover={false}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24, fontWeight: 700 }}>Domain Scores</div>
                  {domains.map(d => (
                    <div key={d.label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>{d.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{d.v}</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                        <div style={{ height: "100%", width: `${d.v}%`, background: d.color, borderRadius: 2, boxShadow: `0 0 10px ${d.color}55`, transition: "width 1s ease" }} />
                      </div>
                    </div>
                  ))}
                </DarkCard>
              </div>

              {/* Neural Pattern Anomaly row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
                {[
                  { key: "alzheimers", label: "Memory Deviation Index", icon: "🧩", color: PUR, desc: "Memory & recall pattern" },
                  { key: "dementia",   label: "Executive Drift Score",  icon: "🌀", color: AMB, desc: "Attention & processing" },
                  { key: "parkinsons", label: "Motor Anomaly Index",    icon: "🎯", color: BLU, desc: "Motor coordination" },
                ].map(d => {
                  const prob  = Math.round((last[`${d.key}_risk`] || 0) * 100);
                  const level = last.risk_levels?.[d.key] || "Low";
                  const lvlColor    = level === "High" ? RED : level === "Moderate" ? AMB : T.green;
                  const statusLabel = level === "High" ? "Worth Monitoring" : level === "Moderate" ? "Some Variation" : "Typical Range";
                  return (
                    <DarkCard key={d.key} style={{ padding: 22, border: `1px solid ${d.color}20` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{d.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>{d.label}</div>
                            <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{d.desc}</div>
                          </div>
                        </div>
                        <span style={{ background: `${lvlColor}18`, color: lvlColor, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, border: `1px solid ${lvlColor}33` }}>{statusLabel}</span>
                      </div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: 40, color: d.color, lineHeight: 1 }}>{prob}<span style={{ fontSize: 16, color: "#555" }}>%</span></div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", marginTop: 12 }}>
                        <div style={{ height: "100%", width: `${prob}%`, background: d.color, borderRadius: 2 }} />
                      </div>
                    </DarkCard>
                  );
                })}
              </div>

              {/* View Results CTA */}
              <DarkCard style={{ padding: 28, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${LIME}28` }} hover={false}>
                <div>
                  <div style={{ color: LIME, fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>● Latest session</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: "clamp(16px,2vw,22px)", color: "#fff", marginBottom: 4, letterSpacing: "-0.5px" }}>
                    View full neural pattern report
                  </div>
                  <div style={{ color: "#555", fontSize: 13 }}>Explainability · Risk drivers · Wellness recommendations</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <Btn onClick={() => setPage("results")} style={{ fontSize: 13 }}>View Report →</Btn>
                  <Btn variant="ghost" onClick={() => setPage("progress")} style={{ fontSize: 13 }}>📈 Progress</Btn>
                </div>
              </DarkCard>
            </>
          )}

          {/* ── No data empty state ── */}
          {!hasData && (
            <DarkCard style={{ padding: 40, textAlign: "center", border: `1px solid ${LIME}15` }} hover={false}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📊</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", marginBottom: 8 }}>
                Your dashboard will populate here
              </div>
              <p style={{ color: "#555", fontSize: 13, maxWidth: 380, margin: "0 auto", lineHeight: 1.7 }}>
                Complete your first 5-test assessment above to see your cognitive score, domain breakdown, and neural pattern analysis.
              </p>
            </DarkCard>
          )}
        </>
      )}
    </div>
  );
}
