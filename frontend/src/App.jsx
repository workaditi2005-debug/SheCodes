import { useState } from "react";
import { injectStyles } from "./utils/theme";
import { Shell } from "./components/RiskDashboard";
import { AssessmentProvider } from "./context/AssessmentContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getUser, isLoggedIn, logout } from "./services/api";
import OfflineStatusIndicator from "./components/common/OfflineStatusIndicator";
import { LanguageProvider } from "./i18n/LanguageContext";
import LanguageSelector from "./components/common/LanguageSelector";
import VoiceControl from "./components/common/VoiceControl";
import SihDemoController from "./components/demo/SihDemoController";

import LandingPage     from "./pages/LandingPage";
import AboutPage       from "./pages/AboutPage";
import LoginPage       from "./pages/Login";
import ProfileSetup    from "./pages/ProfileSetup";
import UserDashboard   from "./pages/UserDashboard";
import AssessmentHub   from "./pages/AssessmentHub";
import ResultsPage     from "./pages/ResultsPage";
import ProgressPage    from "./pages/ProgressPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import MessagesPage    from "./pages/MessagesPage";
import DoctorHome      from "./pages/DoctorHome";
import PatientDetail   from "./pages/PatientDetail";
import ContentManager  from "./pages/ContentManager";
import DoctorSelection from "./pages/DoctorSelection";
import DailyCare from "./pages/DailyCare";
import CareTeamDashboard from "./pages/CareTeamDashboard";

import SpeechTest   from "./components/SpeechTest";
import MemoryTest   from "./components/MemoryTest";
import ReactionTest from "./components/ReactionTest";
import StroopTest   from "./components/StroopTest";
import TapTest      from "./components/TapTest";

import CognitiveGamesHub      from "./pages/CognitiveGamesHub";
import MemoryMatchGame        from "./components/games/MemoryMatchGame";
import SequenceRecallGame     from "./components/games/SequenceRecallGame";
import ObjectRecognitionGame  from "./components/games/ObjectRecognitionGame";
import PatternCompletionGame  from "./components/games/PatternCompletionGame";
import DailyRoutineGame       from "./components/games/DailyRoutineGame";
import NeuroBot               from "./components/NeuroBot";

injectStyles();

function getInitialState() {
  const user = getUser();
  if (user && isLoggedIn()) {
    const role = user.role === "doctor" ? "doctor" : user.role === "caregiver" ? "caregiver" : "user";
    const view = role === "doctor" ? "doctor-dashboard" : role === "caregiver" ? "caregiver-dashboard" : "dashboard";
    const page = view;
    return { view, role, page, user };
  }
  return { view: "landing", role: "user", page: "dashboard", user: null };
}

function MainApp() {
  const init = getInitialState();
  const { logout: firebaseLogout } = useAuth();

  const [view,           setViewState]      = useState(init.view);
  const [role,           setRole]           = useState(init.role);
  const [page,           setPage]           = useState(init.page);
  const [patient,        setPatient]        = useState(null);
  const [currentUser,    setCurrentUser]    = useState(init.user);
  const [demoActive,     setDemoActive]     = useState(false);

  // Profile setup — shown once after first registration for patients
  const [showProfile,    setShowProfile]    = useState(false);
  const [pendingUser,    setPendingUser]     = useState(null);
  const [pendingRole,    setPendingRole]     = useState(null);

  async function handleLogout() {
    try {
      if (firebaseLogout) {
        await firebaseLogout();
      }
    } catch (e) {
      console.warn("Firebase signout error:", e);
    }
    try {
      await logout();
    } catch (e) {
      console.warn("Backend logout error:", e);
    } finally {
      clearSession();
      setCurrentUser(null);
      setRole("user");
      setPage("dashboard");
      setViewState("landing");
      setShowProfile(false);
      setDemoActive(false);
    }
  }

  function setView(v) {
    if (v === "logout") { handleLogout(); return; }
    if (v === "dashboard")           { setPage("dashboard");           }
    if (v === "doctor-dashboard")    { setPage("doctor-dashboard");    }
    if (v === "caregiver-dashboard") { setPage("caregiver-dashboard"); }
    setViewState(v);
  }

  // Called by LoginPage after successful login or registration
  function handleAuthSuccess(user, resolvedRole, isNewUser = false) {
    setCurrentUser(user);
    const r = resolvedRole === "doctor" ? "doctor" : resolvedRole === "caregiver" ? "caregiver" : "user";
    setRole(r);
    // Show profile setup only for new patient registrations
    if (isNewUser && r === "user") {
      setPendingUser(user);
      setPendingRole(r);
      setShowProfile(true);
    } else {
      setViewState(r === "doctor" ? "doctor-dashboard" : r === "caregiver" ? "caregiver-dashboard" : "dashboard");
      setPage(r === "doctor" ? "doctor-dashboard" : r === "caregiver" ? "caregiver-dashboard" : "dashboard");
    }
  }

  function handleProfileComplete() {
    setShowProfile(false);
    const r = pendingRole || "user";
    setRole(r);
    setViewState("dashboard");
    setPage("dashboard");
  }

  function handleStartSihDemo() {
    setDemoActive(true);
  }

  // ── Patient pages ─────────────────────────────────────────────────────────
  const userPages = {
    "dashboard":   <UserDashboard  setPage={setPage} />,
    "assessments": <AssessmentHub  setPage={setPage} />,
    "speech":      <SpeechTest     setPage={setPage} />,
    "memory":      <MemoryTest     setPage={setPage} />,
    "reaction":    <ReactionTest   setPage={setPage} />,
    "stroop":      <StroopTest     setPage={setPage} />,
    "tap":         <TapTest        setPage={setPage} />,
    "results":     <ResultsPage    setPage={setPage} />,
    "progress":    <ProgressPage   setPage={setPage} />,
    "games":       <CognitiveGamesHub setPage={setPage} />,
    "daily-care":  <DailyCare />,
    "game-match":  <MemoryMatchGame setPage={setPage} />,
    "game-sequence": <SequenceRecallGame setPage={setPage} />,
    "game-object": <ObjectRecognitionGame setPage={setPage} />,
    "game-pattern": <PatternCompletionGame setPage={setPage} />,
    "game-routine": <DailyRoutineGame setPage={setPage} />,
    "messages":    <MessagesPage />,
    "doctors":     <DoctorSelection setPage={setPage} />,
  };

  // ── Doctor pages ──────────────────────────────────────────────────────────
  const doctorPages = {
    "doctor-analytics": <CareTeamDashboard doctor />,
    "doctor-dashboard": <DoctorHome      setPage={setPage} setSelectedPatient={setPatient} />,
    "patients":         <DoctorDashboard setPage={setPage} setSelectedPatient={setPatient} />,
    "patient-detail":   <PatientDetail   setPage={setPage} patient={patient} />,
    "messages":         <MessagesPage />,
    "content":          <ContentManager />,
  };

  const caregiverPages = { "caregiver-dashboard": <CareTeamDashboard />, "messages": <MessagesPage /> };

  const isDoctor = role === "doctor";
  const content  = role === "caregiver" ? (caregiverPages[page] ?? caregiverPages["caregiver-dashboard"]) : isDoctor
    ? (doctorPages[page] ?? doctorPages["doctor-dashboard"])
    : (userPages[page]   ?? userPages["dashboard"]);

  return (
    <LanguageProvider>
      <AssessmentProvider>
        {/* Deterministic SIH Demo HUD Controller */}
        <SihDemoController
          active={demoActive}
          onClose={() => setDemoActive(false)}
          view={view}
          role={role}
          page={page}
          setView={setView}
          setRole={setRole}
          setPage={setPage}
          setPatient={setPatient}
          setCurrentUser={setCurrentUser}
        />

        {/* Profile Setup screen (after new patient registration) */}
        {showProfile ? (
          <ProfileSetup user={pendingUser || currentUser} onComplete={handleProfileComplete} />
        ) : view === "landing" ? (
          <LandingPage setView={setView} currentUser={currentUser} onStartSihDemo={handleStartSihDemo} />
        ) : view === "about" ? (
          <AboutPage setView={setView} />
        ) : view === "login" ? (
          <LoginPage
            setView={setView}
            setRole={r => setRole(r === "doctor" ? "doctor" : r === "caregiver" ? "caregiver" : "user")}
            setCurrentUser={setCurrentUser}
            onAuthSuccess={handleAuthSuccess}
            onStartSihDemo={handleStartSihDemo}
          />
        ) : !currentUser && !demoActive ? (
          <LandingPage setView={setView} currentUser={null} onStartSihDemo={handleStartSihDemo} />
        ) : (
          <Shell
            role={role}
            page={page}
            setPage={setPage}
            setView={setView}
            currentUser={currentUser}
            onLogout={handleLogout}
          >
            <div style={{ position: "fixed", top: 12, right: 16, zIndex: 1000, display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={handleStartSihDemo}
                title="Launch Deterministic SIH Demo Mode (4 min)"
                style={{
                  background: demoActive ? "#f59e0b" : "linear-gradient(135deg, #c8f135, #a3e635)",
                  color: "#080808",
                  border: "none",
                  borderRadius: 999,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 0 16px rgba(200,241,53,0.45)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>⚡</span> {demoActive ? "SIH Demo (Active)" : "Start SIH Demo"}
              </button>
              <LanguageSelector />
              <VoiceControl setPage={setPage} />
              <OfflineStatusIndicator />
            </div>
            {content}
          </Shell>
        )}
        <NeuroBot user={currentUser} />
      </AssessmentProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
