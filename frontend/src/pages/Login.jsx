import { useState } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Stars } from "../components/RiskDashboard";
import { saveSession, getUser, firebaseOnboard, fetchMe, updateProfile } from "../services/api";
import { useAuth } from "../context/AuthContext";
import LanguageSelector from "../components/common/LanguageSelector";

const LIME = "#C8F135";

export default function LoginPage({ setView, setRole, setCurrentUser, onAuthSuccess, onStartSihDemo }) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode]     = useState("user");   // "user" | "caregiver" | "doctor"
  const [tab, setTab]       = useState("login");  // "login" | "register"
  const [step, setStep]     = useState(1);        // doctor register: step 1 or 2
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Shared fields
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");

  // Doctor-specific fields
  const [license,       setLicense]       = useState("");
  const [specialization, setSpecialization] = useState("");
  const [hospital,      setHospital]      = useState("");
  const [location,      setLocation]      = useState("");
  const [yearsExp,      setYearsExp]      = useState("");
  const [consultMode,   setConsultMode]   = useState("Both");
  const [bio,           setBio]           = useState("");

  // Patient-specific
  const [age, setAge] = useState("");

  const backendRole = mode === "doctor" ? "doctor" : mode === "caregiver" ? "caregiver" : "patient";
  const isDoctorRegister = mode === "doctor" && tab === "register";

  async function handleSubmit() {
    setError("");

    if (!email.trim() || !password.trim()) return setError("Email and password are required.");
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(email.trim())) return setError("Please enter a valid email address.");

    // ── DOCTOR REGISTRATION: STEP 1 (Account Details) ──────────────────────────
    if (isDoctorRegister && step === 1) {
      if (!fullName.trim()) return setError("Full name is required.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
      if (!license.trim()) return setError("Medical license number is required.");
      if (!specialization) return setError("Please select a specialization.");

      setLoading(true);
      try {
        // 1. Firebase Authentication: Create user (or sign in if already created)
        let fbUser = null;
        let idToken = null;
        try {
          const cred = await signUpWithEmail(email.trim(), password);
          fbUser = cred.user;
          idToken = await fbUser.getIdToken();
        } catch (authErr) {
          if (authErr.message?.includes("already exists") || authErr.code === "auth/email-already-in-use") {
            const cred = await signInWithEmail(email.trim(), password);
            fbUser = cred.user;
            idToken = await fbUser.getIdToken();
          } else {
            throw authErr;
          }
        }

        // 2. Onboard verified doctor profile with FastAPI backend
        const doctorMetadata = {
          full_name: fullName.trim(),
          role: "doctor",
          license_number: license.trim(),
          specialization: specialization,
          years_experience: yearsExp ? parseInt(yearsExp) : undefined,
          max_patients: 10,
        };

        const onboardRes = await firebaseOnboard(doctorMetadata, idToken);
        const registeredDoc = onboardRes.user;
        saveSession(idToken, registeredDoc);

        // 3. Advance to Clinic Info step
        setStep(2);
      } catch (err) {
        console.error("[Doctor Registration Step 1 Error]:", err);
        setError(err.message || "Failed to complete account registration. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── DOCTOR REGISTRATION: STEP 2 (Clinic Info) ──────────────────────────────
    if (isDoctorRegister && step === 2) {
      if (!hospital.trim()) return setError("Hospital / clinic name is required.");

      setLoading(true);
      try {
        const idToken = (await fbUser?.getIdToken?.()) || sessionStorage.getItem("neuroaid_token");
        const clinicData = {
          hospital: hospital.trim(),
          location: location.trim() || undefined,
          consultation_mode: consultMode || "Both",
          bio: bio.trim() || undefined,
        };

        const updatedRes = await updateProfile(clinicData, idToken);
        const currentDoc = updatedRes.user || { ...getUser(), ...clinicData };
        saveSession(idToken, currentDoc);

        if (onAuthSuccess) {
          onAuthSuccess(currentDoc, "doctor", true);
        } else {
          if (setCurrentUser) setCurrentUser(currentDoc);
          setRole("doctor");
          setView("doctor-dashboard");
        }
      } catch (err) {
        console.error("[Doctor Registration Step 2 Error]:", err);
        setError(err.message || "Failed to save clinic information. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── STANDARD REGISTRATION (Patient / Caregiver) ───────────────────────────
    if (tab === "register") {
      if (!fullName.trim()) return setError("Full name is required.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }

    setLoading(true);
    try {
      if (tab === "login") {
        // ── 1. Real Firebase Authentication ──────────────────────────────────
        const userCredential = await signInWithEmail(email.trim(), password);
        const fbUser = userCredential.user;
        const idToken = await fbUser.getIdToken();

        // ── 2. Retrieve verified NeuroAid profile from FastAPI backend ──────
        let userProfile = null;
        try {
          userProfile = await fetchMe(idToken);
        } catch {
          // If profile does not exist yet on backend, onboard using verified identity
          const onboardRes = await firebaseOnboard(
            {
              full_name: fbUser.displayName || email.trim().split("@")[0],
              role: backendRole,
            },
            idToken
          );
          userProfile = onboardRes.user;
        }

        saveSession(idToken, userProfile);

        if (onAuthSuccess) {
          onAuthSuccess(userProfile, userProfile.role || backendRole, false);
        } else {
          if (setCurrentUser) setCurrentUser(userProfile);
          setRole(mode);
          setView(mode === "doctor" ? "doctor-dashboard" : mode === "caregiver" ? "caregiver-dashboard" : "dashboard");
        }
      } else {
        // ── Standard Patient/Caregiver Registration ──────────────────────────
        const userCredential = await signUpWithEmail(email.trim(), password);
        const fbUser = userCredential.user;
        const idToken = await fbUser.getIdToken();

        const registrationMetadata = {
          full_name: fullName.trim(),
          role: backendRole,
          age: age ? parseInt(age) : undefined,
        };

        const onboardRes = await firebaseOnboard(registrationMetadata, idToken);
        const registeredUser = onboardRes.user;

        saveSession(idToken, registeredUser);

        if (onAuthSuccess) {
          onAuthSuccess(registeredUser, backendRole, true);
        } else {
          if (setCurrentUser) setCurrentUser(registeredUser);
          setRole(mode);
          setView(mode === "caregiver" ? "caregiver-dashboard" : "dashboard");
        }
      }
    } catch (err) {
      console.error("[Login/Register Error]:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      // First-time Google accounts default to patient role (never auto-doctor/admin)
      const googleRole = "patient";
      const isFirstTime = Boolean(result._tokenResponse?.isNewUser);

      let userProfile = null;
      try {
        userProfile = await fetchMe(idToken);
      } catch {
        const onboardRes = await firebaseOnboard(
          {
            full_name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
            role: googleRole,
          },
          idToken
        );
        userProfile = onboardRes.user;
      }

      saveSession(idToken, userProfile);

      if (onAuthSuccess) {
        onAuthSuccess(userProfile, "user", isFirstTime);
      } else {
        if (setCurrentUser) setCurrentUser(userProfile);
        setRole("user");
        setView("dashboard");
      }
    } catch (err) {
      setError(err.message || "Google Sign-In failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode); setError(""); setStep(1);
    setFullName(""); setEmail(""); setPassword(""); setLicense(""); setAge("");
    setSpecialization(""); setHospital(""); setLocation(""); setYearsExp(""); setBio("");
  }

  function switchTab(newTab) { setTab(newTab); setError(""); setStep(1); }

  const inputStyle = { padding: "12px 15px", borderRadius: 11, fontSize: 14, fontFamily: "'DM Sans',sans-serif", width: "100%" };
  const selectStyle = { ...inputStyle, background: "#1a1a1a", color: T.cream, border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", colorScheme: "dark", outline: "none" };
  const labelStyle = { fontSize: 11, color: T.creamFaint, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 };

  const SPECIALIZATIONS = ["Neurology","Psychiatry","Geriatrics","Neuropsychology","Internal Medicine","General Practice","Other"];
  const CONSULT_MODES   = ["Online","Offline","Both"];

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(200,40,40,0.20) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(245,158,11,0.08) 0%, transparent 55%), ${T.bg}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
      <Stars count={60} />

      <div style={{ position: "fixed", top: 20, right: 24, zIndex: 10 }}>
        <LanguageSelector />
      </div>

      <div style={{ width: "100%", maxWidth: isDoctorRegister ? 500 : 420, position: "relative", zIndex: 2 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,rgba(232,64,64,0.9),rgba(200,36,36,0.95))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px", boxShadow: `0 0 32px rgba(232,64,64,0.45), inset 0 1px 0 rgba(255,255,255,0.16)` }}>⬡</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, color: T.cream }}>NeuroAid</div>
          <div style={{ color: T.creamFaint, fontSize: 13, marginTop: 4 }}>Cognitive AI Platform</div>
        </div>

        <DarkCard style={{ padding: 32 }} hover={false}>

          {/* SIH Demo Direct Launch Banner */}
          <div style={{ marginBottom: 22, background: "linear-gradient(135deg, rgba(200,241,53,0.14), rgba(163,230,53,0.06))", border: "1px solid rgba(200,241,53,0.35)", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: 0.8 }}>
                SIH 2026 Judge Evaluation
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                Deterministic 4-Min Experience
              </div>
            </div>
            <button
              type="button"
              onClick={onStartSihDemo}
              style={{
                background: "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: 10,
                padding: "9px 15px",
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(200,241,53,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚡</span> Launch Demo
            </button>
          </div>

          {/* Role switcher */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 50, padding: 4, marginBottom: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
            {[{ key: "user", label: "👤 Patient" }, { key: "caregiver", label: "👥 Caregiver" }, { key: "doctor", label: "🩺 Doctor" }].map(r => (
              <button key={r.key} onClick={() => switchMode(r.key)} style={{ flex: 1, padding: "9px 0", borderRadius: 50, border: "none", background: mode === r.key ? "linear-gradient(135deg,rgba(232,64,64,0.88),rgba(200,36,36,0.95))" : "transparent", color: mode === r.key ? "#fff" : T.creamFaint, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Role hint */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "9px 14px", marginBottom: 20, fontSize: 12, color: T.creamFaint, border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
            {mode === "doctor" ? "🩺 Doctor accounts supervise patients and view neural pattern analytics" : "👤 Patient accounts take cognitive assessments and track progress"}
          </div>

          {/* Login / Register tabs */}
          <div style={{ display: "flex", marginBottom: 22, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {["login", "register"].map(t => (
              <button key={t} onClick={() => switchTab(t)} style={{ flex: 1, padding: "8px 0", border: "none", background: "transparent", color: tab === t ? T.cream : T.creamFaint, fontWeight: tab === t ? 700 : 400, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", borderBottom: tab === t ? `2px solid ${T.red}` : "2px solid transparent", marginBottom: -1, transition: "all 0.2s", textTransform: "capitalize" }}>{t}</button>
            ))}
          </div>

          {/* ── Doctor Register: Step indicator ── */}
          {isDoctorRegister && (
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {["Account Details", "Clinic Info"].map((label, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <div style={{ height: 3, borderRadius: 2, background: i < step ? T.red : "rgba(255,255,255,0.08)", marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: i < step ? T.red : "rgba(255,255,255,0.25)", fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── Google Sign-In (Firebase Auth) ── */}
            {(!isDoctorRegister || step === 1) && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "11px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: T.cream,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    fontFamily: "'DM Sans',sans-serif",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                  onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div style={{ display: "flex", alignItems: "center", margin: "2px 0 4px", gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  <span style={{ fontSize: 10, color: T.creamFaint, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>or with email</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>
              </>
            )}

            {/* ── Shared: Name, Email, Password ── */}
            {(!isDoctorRegister || step === 1) && tab === "register" && (
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input placeholder="Dr. Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} className="glass-input" style={inputStyle} />
              </div>
            )}

            {(!isDoctorRegister || step === 1) && (
              <>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="glass-input" style={inputStyle} autoComplete="email" />
                </div>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input type="password" placeholder={tab === "login" ? "Enter password" : "Min. 6 characters"} value={password} onChange={e => setPassword(e.target.value)} className="glass-input" style={inputStyle} autoComplete={tab === "login" ? "current-password" : "new-password"} />
                </div>
              </>
            )}

            {/* ── Patient register extras ── */}
            {tab === "register" && mode === "user" && (
              <div>
                <label style={labelStyle}>Age (optional)</label>
                <input type="number" placeholder="e.g. 45" value={age} onChange={e => setAge(e.target.value)} className="glass-input" style={inputStyle} />
              </div>
            )}

            {/* ── Doctor Register: Step 1 ── */}
            {isDoctorRegister && step === 1 && (
              <>
                <div>
                  <label style={labelStyle}>Medical License Number *</label>
                  <input placeholder="e.g. MCI-123456" value={license} onChange={e => setLicense(e.target.value)} className="glass-input" style={inputStyle} autoComplete="off" />
                </div>
                <div>
                  <label style={labelStyle}>Specialization *</label>
                  <select value={specialization} onChange={e => setSpecialization(e.target.value)} style={selectStyle}>
                    <option value="" style={{ background: "#1a1a1a" }}>Select specialization…</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s} style={{ background: "#1a1a1a" }}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Years of Experience</label>
                  <input type="number" min="0" max="60" placeholder="e.g. 12" value={yearsExp} onChange={e => setYearsExp(e.target.value)} className="glass-input" style={inputStyle} />
                </div>
              </>
            )}

            {/* ── Doctor Register: Step 2 ── */}
            {isDoctorRegister && step === 2 && (
              <>
                <div>
                  <label style={labelStyle}>Hospital / Clinic Name *</label>
                  <input placeholder="e.g. Apollo Hospitals, Delhi" value={hospital} onChange={e => setHospital(e.target.value)} className="glass-input" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Location (City)</label>
                  <input placeholder="e.g. Mumbai, India" value={location} onChange={e => setLocation(e.target.value)} className="glass-input" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Consultation Mode</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {CONSULT_MODES.map(m => (
                      <button key={m} onClick={() => setConsultMode(m)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${consultMode === m ? T.red : "rgba(255,255,255,0.12)"}`, background: consultMode === m ? "rgba(232,64,64,0.15)" : "transparent", color: consultMode === m ? T.red : T.creamFaint, fontSize: 13, fontWeight: consultMode === m ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>{m}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Short Bio (optional)</label>
                  <textarea placeholder="Brief description of your practice and expertise…" value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...inputStyle, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.10)", resize: "none", lineHeight: 1.5 }} />
                </div>
                <div style={{ background: "rgba(200,241,53,0.06)", border: `1px solid ${LIME}22`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: LIME }}>
                  ✓ Max patients is fixed at 10 per doctor. Patients can request enrollment from their dashboard.
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center", padding: "10px 14px", background: "rgba(232,64,64,0.10)", borderRadius: 10, border: "1px solid rgba(232,64,64,0.25)", lineHeight: 1.5 }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── Doctor Step 2: Back button ── */}
            {isDoctorRegister && step === 2 && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setStep(1); setError(""); }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${T.cardBorder}`, background: "transparent", color: T.creamFaint, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
                <Btn onClick={handleSubmit} disabled={loading} style={{ flex: 2, justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Creating account…" : "Register as Doctor →"}
                </Btn>
              </div>
            )}

            {!(isDoctorRegister && step === 2) && (
              <Btn onClick={handleSubmit} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 2, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Please wait…"
                  : isDoctorRegister && step === 1 ? "Next: Clinic Info →"
                  : tab === "login" ? `Sign In as ${mode === "doctor" ? "Doctor" : "Patient"} →`
                  : "Create Account →"}
              </Btn>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button onClick={() => setView("landing")} style={{ background: "none", border: "none", color: T.creamFaint, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Back to Home</button>
          </div>
        </DarkCard>
      </div>
    </div>
  );
}
