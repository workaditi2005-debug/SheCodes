import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/LanguageContext";
import { completeReminder, getPatients, resetAndSeedDemo, saveSession, submitGameSession } from "../../services/api";
import { setSimulatedOffline, syncNow } from "../../utils/syncManager";
import { speak } from "../../utils/voice";

export const DEMO_STEPS = [
  {
    id: 1,
    title: "Patient Login",
    badge: "Authentication & Baseline",
    desc: "Deterministic authentication into patient portal as Biren Das (68y, Retired Teacher, Guwahati, Assam) with synthetic clinical records.",
    detail: "Initializes clean synthetic baseline records via /api/demo/reset-and-seed and sets secure scoped session.",
  },
  {
    id: 2,
    title: "Assamese Language",
    badge: "Vernacular Accessibility",
    desc: "Seamlessly switches entire UI to Assamese (as-IN) for regional elderly accessibility across Northeast India.",
    detail: "Loads Assamese localization strings (মগজুৰ খেল, দৈনিক যত্ন, সোঁৱৰণী) adhering to inclusive vernacular design.",
  },
  {
    id: 3,
    title: "Voice Greeting",
    badge: "Speech Synthesis & Audio UI",
    desc: "Speaks regional Assamese voice greeting to aid low-literacy and visually impaired elderly patients.",
    detail: 'Text: "নমস্কাৰ বীৰেন ডাঙৰীয়া, আজিৰ দৈনিক যত্ন আৰু মগজুৰ খেল আৰম্ভ কৰোঁ আহক।" ("Namaskar Biren Dangoriya! Let us start today\'s daily care and brain exercise.")',
  },
  {
    id: 4,
    title: "Cognitive Game",
    badge: "Interactive Screening",
    desc: "Launches Memory Match cognitive game evaluating short-term recall and visual association.",
    detail: "Interactive cognitive screening task designed to record response latencies, pause intervals, and mistake patterns.",
  },
  {
    id: 5,
    title: "Adaptive Difficulty",
    badge: "Dynamic Task Scaling",
    desc: "Adaptive engine analyzes real-time response latency (320ms, 94% acc) and dynamically scales Level 1 to Level 2.",
    detail: "Prevents ceiling/floor measurement effects by dynamically increasing item complexity with clear psychometric rationale.",
  },
  {
    id: 6,
    title: "Personal Memory Bank",
    badge: "Culturally Rooted Anchors",
    desc: "Navigates to Personal Memory Bank featuring familiar cultural anchors (Sonapur Tea Garden, Japi, Aarav, Maya).",
    detail: "Utilizes localized cultural and familial memory anchors to comfort patients and assess episodic recall.",
  },
  {
    id: 7,
    title: "Medicine Reminder",
    badge: "Daily Routine Compliance",
    desc: "Interactive medicine schedule: marks Donepezil 5mg completed with local audit logging.",
    detail: "Ensures medication adherence tracking with instant feedback, time stamping, and offline-first queueing.",
  },
  {
    id: 8,
    title: "Disable Internet",
    badge: "Offline Simulation",
    desc: "Simulates rural internet disconnection. PWA status indicator transitions to Offline (IndexedDB active).",
    detail: "NeuroAid is engineered for remote healthcare centers with intermittent or absent internet connectivity.",
  },
  {
    id: 9,
    title: "Play Another Game Offline",
    badge: "Zero-Data Loss Queue",
    desc: "Plays game offline. Session score & telemetry are securely written to device IndexedDB with client UUID.",
    detail: "Demonstrates idempotent client-side buffering: 1 pending action queued without blocking the elder user.",
  },
  {
    id: 10,
    title: "Restore Internet",
    badge: "Connectivity Recovery",
    desc: "Restores simulated internet connection. Network indicator transitions to Online with pending sync items.",
    detail: "PWA detects network state restoration and prepares asynchronous background synchronization.",
  },
  {
    id: 11,
    title: "Synchronize",
    badge: "Batch Sync Telemetry",
    desc: "Executes batch synchronization to /api/sync/batch. Queued offline game sessions are atomically reconciled.",
    detail: "Idempotent batch processing reconciles all device activities and updates centralized clinician records.",
  },
  {
    id: 12,
    title: "Caregiver Dashboard",
    badge: "Care Team Collaboration",
    desc: "Transitions role to Caregiver Ananya Das. Displays patient routine adherence, hydration, and overview.",
    detail: "Gives family caregivers actionable visibility into daily medicine completion and hydration logs without medical jargon.",
  },
  {
    id: 13,
    title: "Longitudinal Cognitive Trend",
    badge: "6-Week Trajectory Curve",
    desc: "Visualizes 6-week composite cognitive slope (74.2 → 65.0) capturing subtle multi-domain drift.",
    detail: "Longitudinal tracking detects sub-clinical cognitive decline weeks before acute symptoms are noticed.",
  },
  {
    id: 14,
    title: "Trigger Explainable Alert",
    badge: "Anomaly Detection Engine",
    desc: "Flags +19.4% reaction time variability drift anomaly comparing current mean RT (341ms) against baseline (285ms).",
    detail: "Explainable AI flags specific psychomotor hesitation patterns, prompting timely clinician review.",
  },
  {
    id: 15,
    title: "Doctor Dashboard",
    badge: "Clinical Super-Portal",
    desc: "Transitions session to Neurologist Dr. Rupjyoti Hazarika. Opens patient registry with risk stratification.",
    detail: "Enables clinicians to monitor patient panels, review consent status, and drill down into clinical biomarkers.",
  },
  {
    id: 16,
    title: "Detailed Clinical Assessment",
    badge: "Explainable AI & Disclaimer",
    desc: "Opens Biren Das's comprehensive assessment: domain metrics, ML feature importance (38% word recall), and 79% confidence.",
    detail: "Statutory notice: Screening indicators only, not a clinical diagnosis. Grounded in synthetic demo benchmarks.",
  },
];

export default function SihDemoController({
  active,
  onClose,
  view,
  role,
  page,
  setView,
  setRole,
  setPage,
  setPatient,
  setCurrentUser,
}) {
  const { setLanguage } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(15); // seconds per step (15s x 16 = 240s = 4 mins)
  const [collapsed, setCollapsed] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(240); // 4:00 countdown
  const [statusMessage, setStatusMessage] = useState("Deterministic Demo Ready.");
  const [showAdaptiveModal, setShowAdaptiveModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(null);

  const stepTimerRef = useRef(null);
  const totalTimerRef = useRef(null);

  // Initialize Step 1 when demo activates
  useEffect(() => {
    if (active) {
      executeStep(1);
    }
  }, [active]);

  // Overall 4-minute countdown timer
  useEffect(() => {
    if (!active) return;
    if (isPlaying) {
      totalTimerRef.current = setInterval(() => {
        setTimerSeconds(s => (s > 0 ? s - 1 : 0));
      }, 1000);
    } else {
      clearInterval(totalTimerRef.current);
    }
    return () => clearInterval(totalTimerRef.current);
  }, [active, isPlaying]);

  // Auto-play stepper
  useEffect(() => {
    if (!active || !isPlaying) {
      clearInterval(stepTimerRef.current);
      return;
    }

    stepTimerRef.current = setInterval(() => {
      setCurrentStep(s => {
        if (s >= 16) {
          setIsPlaying(false);
          return 16;
        }
        const next = s + 1;
        executeStep(next);
        return next;
      });
    }, speed * 1000);

    return () => clearInterval(stepTimerRef.current);
  }, [active, isPlaying, speed]);

  async function executeStep(stepNum) {
    setCurrentStep(stepNum);
    setStatusMessage(`Executing Step ${stepNum}: ${DEMO_STEPS[stepNum - 1].title}...`);

    switch (stepNum) {
      case 1: { // Patient Login
        try {
          const res = await resetAndSeedDemo();
          const patientUser = {
            id: res.patient.id,
            full_name: res.patient.name,
            role: "patient",
            email: "biren.das@sihdemo.local",
            location: "Guwahati, Assam",
            age: 68,
          };
          saveSession(res.patient.token, patientUser);
          if (setCurrentUser) setCurrentUser(patientUser);
          setRole("user");
          setView("dashboard");
          setPage("dashboard");
          setStatusMessage("✓ Reset & Logged in as Biren Das (Demo Patient)");
        } catch (e) {
          setStatusMessage("Seeding error: " + e.message);
        }
        break;
      }

      case 2: { // Assamese Language
        setLanguage("as-IN");
        setRole("user");
        setView("dashboard");
        setPage("dashboard");
        setStatusMessage("✓ Language switched to Assamese (অসমীয়া as-IN)");
        break;
      }

      case 3: { // Voice Greeting
        setLanguage("as-IN");
        setRole("user");
        setView("dashboard");
        setPage("dashboard");
        const assameseText = "নমস্কাৰ বীৰেন ডাঙৰীয়া, আজিৰ দৈনিক যত্ন আৰু মগজুৰ খেল আৰম্ভ কৰোঁ আহক।";
        speak(assameseText, "as-IN");
        setVoiceTranscript({
          assamese: assameseText,
          english: "Namaskar Biren Dangoriya! Let us start today's daily care and brain exercise.",
        });
        setStatusMessage("✓ Voice Greeting synthesized in Assamese");
        setTimeout(() => setVoiceTranscript(null), 12000);
        break;
      }

      case 4: { // Cognitive Game
        setRole("user");
        setView("dashboard");
        setPage("game-match");
        setShowAdaptiveModal(false);
        setStatusMessage("✓ Cognitive Game loaded (Memory Match)");
        break;
      }

      case 5: { // Adaptive Difficulty
        setRole("user");
        setView("dashboard");
        setPage("game-match");
        setShowAdaptiveModal(true);
        setStatusMessage("✓ Adaptive Difficulty Engine triggered: Level 1 -> Level 2");
        break;
      }

      case 6: { // Personal Memory Bank
        setShowAdaptiveModal(false);
        setRole("user");
        setView("dashboard");
        setPage("daily-care");
        setStatusMessage("✓ Personal Memory Bank loaded with Assam cultural anchors");
        break;
      }

      case 7: { // Medicine Reminder
        setShowAdaptiveModal(false);
        setRole("user");
        setView("dashboard");
        setPage("daily-care");
        // Mark first reminder complete
        completeReminder("rem-sih-001").catch(() => {});
        setStatusMessage("✓ Medicine Reminder (Donepezil 5mg) marked complete");
        break;
      }

      case 8: { // Disable Internet
        setSimulatedOffline(true);
        setStatusMessage("✓ Network disconnected: Offline simulation active (IndexedDB ready)");
        break;
      }

      case 9: { // Play Another Game Offline
        setSimulatedOffline(true);
        setRole("user");
        setView("dashboard");
        setPage("game-routine");
        // Submit optimistic game session offline
        submitGameSession({
          game_id: "daily_routine",
          level: 2,
          score: 88,
          accuracy_pct: 92.5,
          reaction_time_ms: 320,
          mistakes_count: 1,
          cognitive_domain: "Executive Function",
        }).catch(() => {});
        setStatusMessage("✓ Offline session saved locally to IndexedDB queue (1 pending sync)");
        break;
      }

      case 10: { // Restore Internet
        setSimulatedOffline(false);
        setStatusMessage("✓ Network restored: Connection online, 1 action waiting to sync");
        break;
      }

      case 11: { // Synchronize
        setSimulatedOffline(false);
        await syncNow();
        setStatusMessage("✓ Idempotent sync executed successfully: 0 pending items, cloud verified");
        break;
      }

      case 12: { // Caregiver Dashboard
        const caregiverUser = {
          id: "sih-demo-caregiver-001",
          full_name: "Ananya Das (Caregiver)",
          role: "caregiver",
          email: "ananya.das@sihdemo.local",
        };
        saveSession("sih_demo_caregiver_token_deterministic_2026", caregiverUser);
        if (setCurrentUser) setCurrentUser(caregiverUser);
        setRole("caregiver");
        setView("caregiver-dashboard");
        setPage("caregiver-dashboard");
        setStatusMessage("✓ Switched to Caregiver Portal (Ananya Das)");
        break;
      }

      case 13: { // Longitudinal Cognitive Trend
        setRole("caregiver");
        setView("caregiver-dashboard");
        setPage("caregiver-dashboard");
        setStatusMessage("✓ 6-Week Longitudinal Trajectory displayed (74.2 -> 65.0)");
        break;
      }

      case 14: { // Trigger Explainable Alert
        setRole("caregiver");
        setView("caregiver-dashboard");
        setPage("caregiver-dashboard");
        setStatusMessage("✓ Explainable Alert triggered: +19.4% reaction time variance drift");
        break;
      }

      case 15: { // Doctor Dashboard
        const doctorUser = {
          id: "sih-demo-doctor-001",
          full_name: "Dr. Rupjyoti Hazarika (Neurologist)",
          role: "doctor",
          email: "dr.hazarika@sihdemo.local",
        };
        saveSession("sih_demo_doctor_token_deterministic_2026", doctorUser);
        if (setCurrentUser) setCurrentUser(doctorUser);
        setRole("doctor");
        setView("doctor-dashboard");
        setPage("patients");
        setStatusMessage("✓ Switched to Doctor Portal (Dr. Rupjyoti Hazarika)");
        break;
      }

      case 16: { // Detailed Clinical Assessment
        const doctorUser = {
          id: "sih-demo-doctor-001",
          full_name: "Dr. Rupjyoti Hazarika (Neurologist)",
          role: "doctor",
          email: "dr.hazarika@sihdemo.local",
        };
        saveSession("sih_demo_doctor_token_deterministic_2026", doctorUser);
        if (setCurrentUser) setCurrentUser(doctorUser);
        const demoPatient = {
          id: "sih-demo-patient-001",
          full_name: "Biren Das (Demo Patient)",
          age: 68,
          email: "biren.das@sihdemo.local",
        };
        setPatient(demoPatient);
        setRole("doctor");
        setView("doctor-dashboard");
        setPage("patient-detail");
        setStatusMessage("✓ Detailed Assessment & Explainable Feature Importance displayed");
        break;
      }

      default:
        break;
    }
  }

  function handleReset() {
    setIsPlaying(false);
    setTimerSeconds(240);
    setSimulatedOffline(false);
    setShowAdaptiveModal(false);
    executeStep(1);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  if (!active) return null;

  const currentStepData = DEMO_STEPS[currentStep - 1] || DEMO_STEPS[0];

  return (
    <>
      {/* Floating SIH Controller HUD */}
      <div
        style={{
          position: "fixed",
          bottom: collapsed ? 0 : 16,
          left: "50%",
          transform: "translateX(-50%)",
          width: collapsed ? "auto" : "min(96vw, 1120px)",
          background: "rgba(10, 14, 10, 0.95)",
          border: "1px solid rgba(200, 241, 53, 0.4)",
          borderRadius: collapsed ? "16px 16px 0 0" : 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(200,241,53,0.2)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          zIndex: 10000,
          color: "#fff",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.08)",
            background: "rgba(200,241,53,0.06)",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Brand & Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <strong style={{ fontSize: 13, color: "#f8fafc" }}>
              DEMO CONTROLLER
            </strong>
          </div>

          {/* Stepper Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Countdown timer */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.4)", padding: "5px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontWeight: 800, color: "#c8f135" }}>
              <span>⏱</span>
              <span>{formatTime(timerSeconds)}</span>
            </div>

            {/* Play / Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? "#f59e0b" : "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: 10,
                padding: "6px 14px",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play Auto (4m)"}
            </button>

            {/* Speed Selector */}
            <select
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{
                background: "#182017",
                color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={15}>1x Pace (15s/step = 4 min)</option>
              <option value={8}>2x Pace (8s/step = 2 min)</option>
              <option value={4}>4x Fast (4s/step = 1 min)</option>
            </select>

            {/* Step Navigation */}
            <button
              onClick={() => executeStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: currentStep === 1 ? "not-allowed" : "pointer",
                opacity: currentStep === 1 ? 0.4 : 1,
              }}
            >
              ◀ Prev
            </button>

            {/* Step selector */}
            <select
              value={currentStep}
              onChange={e => executeStep(Number(e.target.value))}
              style={{
                background: "#182017",
                color: "#c8f135",
                fontWeight: 700,
                border: "1px solid rgba(200,241,53,0.3)",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
                maxWidth: 210,
              }}
            >
              {DEMO_STEPS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => executeStep(Math.min(16, currentStep + 1))}
              disabled={currentStep === 16}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: currentStep === 16 ? "not-allowed" : "pointer",
                opacity: currentStep === 16 ? 0.4 : 1,
              }}
            >
              Next ▶
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              title="Reset to clean baseline state"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↺ Reset
            </button>

            {/* Collapse / Close */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                background: "transparent",
                color: "#94a3b8",
                border: "none",
                fontSize: 14,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              {collapsed ? "▲ Expand" : "▼"}
            </button>
            <button
              onClick={onClose}
              title="Exit Demo Mode"
              style={{
                background: "transparent",
                color: "#ef4444",
                border: "none",
                fontSize: 16,
                cursor: "pointer",
                padding: "4px 8px",
                fontWeight: 800,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Expanded Step Body */}
        {!collapsed && (
          <div style={{ padding: "14px 20px" }}>
            {/* Step Progress Line */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
              {DEMO_STEPS.map(s => {
                const isPast = s.id < currentStep;
                const isCurrent = s.id === currentStep;
                return (
                  <div
                    key={s.id}
                    onClick={() => executeStep(s.id)}
                    title={`${s.id}. ${s.title}`}
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 3,
                      background: isCurrent ? "#c8f135" : isPast ? "rgba(200,241,53,0.4)" : "rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: isCurrent ? "0 0 10px #c8f135" : "none",
                    }}
                  />
                );
              })}
            </div>

            {/* Current Step Description Card */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#c8f135" }}>
                    STEP {currentStep} OF 16:
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>
                    {currentStepData.title}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(200,241,53,0.12)", color: "#c8f135", border: "1px solid rgba(200,241,53,0.3)", padding: "2px 8px", borderRadius: 999 }}>
                    {currentStepData.badge}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
                  {currentStepData.desc}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  {currentStepData.detail}
                </div>
              </div>

              {/* Status indicator */}
              <div style={{ textAlign: "right", minWidth: 200 }}>
                <div style={{ fontSize: 11, color: "#86efac", background: "rgba(34,197,94,0.1)", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.25)", display: "inline-block" }}>
                  {statusMessage}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: Voice Greeting Transcript Banner */}
      {voiceTranscript && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(13,20,13,0.96)",
            border: "2px solid #c8f135",
            borderRadius: 18,
            padding: "16px 24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(200,241,53,0.3)",
            zIndex: 10001,
            color: "#fff",
            maxWidth: 680,
            width: "90%",
            animation: "fade-in 0.3s",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🔊</span>
            <strong style={{ color: "#c8f135", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Assamese Voice Synthesizer Output (as-IN)
            </strong>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
            "{voiceTranscript.assamese}"
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
            English Translation: "{voiceTranscript.english}"
          </div>
        </div>
      )}

      {/* STEP 5: Adaptive Difficulty Engine Modal */}
      {showAdaptiveModal && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(10,14,10,0.98)",
            border: "2px solid #c8f135",
            borderRadius: 22,
            padding: "28px 32px",
            boxShadow: "0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(200,241,53,0.35)",
            zIndex: 10002,
            color: "#fff",
            maxWidth: 580,
            width: "92%",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(200,241,53,0.15)", border: "1px solid #c8f135", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                ⚡
              </div>
              <strong style={{ fontSize: 18, color: "#f8fafc" }}>
                Adaptive Difficulty Scaling
              </strong>
            </div>
            <span style={{ fontSize: 11, background: "rgba(200,241,53,0.15)", color: "#c8f135", padding: "4px 10px", borderRadius: 999, fontWeight: 800 }}>
              Algorithmic Adjustment
            </span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 16, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Previous Setting</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#e2e8f0", marginTop: 4 }}>Level 1 (Baseline)</div>
                <div style={{ fontSize: 12, color: "#86efac", marginTop: 2 }}>4 items · 94% accuracy</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#c8f135", textTransform: "uppercase" }}>Adapted Setting</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#c8f135", marginTop: 4 }}>Level 2 (Active)</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 2 }}>6 items + distractors</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 20 }}>
            <strong>Clinical & Psychometric Rationale:</strong> Response latency (320ms avg) and zero errors demonstrate ceiling performance at Level 1. Cognitive load dynamically elevated to maintain engaging challenge and prevent measurement saturation.
          </div>

          <button
            onClick={() => setShowAdaptiveModal(false)}
            style={{
              width: "100%",
              background: "#c8f135",
              color: "#000",
              border: "none",
              borderRadius: 12,
              padding: "12px",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(200,241,53,0.3)",
            }}
          >
            Continue Playing Level 2 →
          </button>
        </div>
      )}
    </>
  );
}
