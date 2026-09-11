/**
 * ProfileSetup.jsx — NeuroAid V4
 * Full patient profile with all clinical normalization fields.
 * Saves via PUT /auth/profile-extended (stores all fields in JSON).
 */
import { useState } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Stars } from "../components/RiskDashboard";
import { getToken, getUser } from "../services/api";

const STEP_COUNT = 4;

async function saveFullProfile(profileData) {
  const token = getToken();
  if (!token) return;
  try {
    // Save basic fields
    await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        full_name: profileData.full_name,
        age:       profileData.age ? parseInt(profileData.age) : undefined,
        gender:    profileData.gender || undefined,
        phone:     profileData.phone || undefined,
      }),
    });
    // Save extended clinical profile
    const res = await fetch("/api/auth/profile-extended", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(profileData),
    });
    if (res.ok) {
      const data = await res.json();
      const current = getUser() || {};
      sessionStorage.setItem("neuroaid_user", JSON.stringify({ ...current, ...data.user, _profile: profileData }));
    }
  } catch (e) {
    console.warn("Profile save failed (non-critical):", e.message);
    // Still store locally
    const current = getUser() || {};
    sessionStorage.setItem("neuroaid_user", JSON.stringify({ ...current, _profile: profileData }));
  }
}

export default function ProfileSetup({ onComplete, user }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    // Step 1 — Basic Info
    age:            user?.age || "",
    phone:          "",
    gender:         "",
    handedness:     "right",
    education:      "",
    occupation:     "",
    // Step 2 — Health Background
    medicalHistory: [],
    currentMeds:    "",
    priorHeadInjury: false,
    exerciseFreq:   "",
    smokingStatus:  "never",
    alcoholUse:     "none",
    // Step 3 — Sleep & Cognitive
    sleepHours:     "",
    sleepQuality:   "normal",
    depressionHistory: false,
    anxietyHistory:    false,
    // Step 4 — Family History & Cognitive Complaints
    familyHistory:         false,
    familyHistoryDetails:  [],
    existingDiagnosis:     false,
    cognitiveComplaints:   [],
    baselineTestDate:      new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  function update(key, val) { setData(d => ({ ...d, [key]: val })); }
  function toggleArr(key, val) {
    setData(d => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter(x => x !== val) : [...d[key], val],
    }));
  }

  async function finish() {
    setLoading(true);
    try {
      await saveFullProfile({ ...data, full_name: user?.full_name || user?.name });
      onComplete({ profile: data, profileComplete: true });
    } catch (e) {
      console.error(e);
      onComplete({ profile: data, profileComplete: true });
    } finally {
      setLoading(false);
    }
  }

  const labelStyle = { fontSize: 11, color: T.creamFaint, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 };
  const inputStyle = { padding: "11px 14px", borderRadius: 10, border: `1px solid ${T.cardBorder}`, background: T.bg2, fontSize: 14, color: T.cream, outline: "none", fontFamily: "'DM Sans',sans-serif", width: "100%" };
  const selectStyle = { ...inputStyle, background: "#1a1a1a", color: T.cream, border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", colorScheme: "dark" };
  const chipBase = (active) => ({ padding: "7px 14px", borderRadius: 50, border: `1px solid ${active ? T.red : T.cardBorder}`, background: active ? "rgba(232,64,64,0.15)" : T.bg3, color: active ? T.red : T.creamDim, fontSize: 12, cursor: "pointer", fontWeight: active ? 600 : 400, transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif" });
  const yesNoStyle = (active) => ({ ...chipBase(active), flex: 1, textAlign: "center" });

  const STEPS = ["Basic Info", "Health", "Sleep & Mental", "History"];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
      <Stars count={40} />
      <div style={{ width: "100%", maxWidth: 580, position: "relative", zIndex: 2 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: T.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px", boxShadow: `0 0 30px ${T.redGlow}` }}>⬡</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: T.cream }}>Welcome, {user?.full_name || user?.name || "there"} 👋</div>
          <div style={{ color: T.creamFaint, fontSize: 13, marginTop: 4 }}>Let's set up your clinical profile (~3 min)</div>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, alignItems: "center" }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 2, background: i < step ? T.red : "rgba(255,255,255,0.08)", transition: "background 0.4s", marginBottom: 4 }} />
              <div style={{ fontSize: 10, color: i < step ? T.red : "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
            </div>
          ))}
        </div>

        <DarkCard style={{ padding: 32 }} hover={false}>

          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: T.cream, marginBottom: 2 }}>Basic Information</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Age *</label>
                  <input type="number" min="18" max="100" placeholder="e.g. 45" value={data.age} onChange={e => update("age", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input type="tel" placeholder="+91 98765 43210" value={data.phone} onChange={e => update("phone", e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Gender</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Male","Female","Non-binary","Prefer not to say"].map(g => (
                    <button key={g} style={chipBase(data.gender === g)} onClick={() => update("gender", g)}>{g}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Dominant Hand</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["right","left","ambidextrous"].map(h => (
                    <button key={h} style={chipBase(data.handedness === h)} onClick={() => update("handedness", h)}>
                      {h.charAt(0).toUpperCase()+h.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Education Level</label>
                  <select value={data.education} onChange={e => update("education", e.target.value)} style={selectStyle}>
                    <option value="" style={{ background: "#1a1a1a" }}>Select…</option>
                    {["High School","Some College","Bachelor's","Master's","Doctoral","Professional Degree"].map(e => (
                      <option key={e} value={e} style={{ background: "#1a1a1a" }}>{e}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Occupation</label>
                  <input placeholder="e.g. Engineer, Retired…" value={data.occupation} onChange={e => update("occupation", e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Health Background ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: T.cream, marginBottom: 2 }}>Health Background</div>

              <div>
                <label style={labelStyle}>Medical History (select all that apply)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Hypertension","Diabetes","Heart Disease","Stroke","Depression","Anxiety","TBI","Sleep Apnea","Thyroid Disorder","None"].map(m => (
                    <button key={m} style={chipBase(data.medicalHistory.includes(m))} onClick={() => toggleArr("medicalHistory", m)}>{m}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Current Medications</label>
                <input placeholder="e.g. Amlodipine, Metformin (or 'None')" value={data.currentMeds} onChange={e => update("currentMeds", e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Prior Head Injury?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{val:true,label:"Yes"},{val:false,label:"No"}].map(opt => (
                    <button key={String(opt.val)} style={yesNoStyle(data.priorHeadInjury === opt.val)} onClick={() => update("priorHeadInjury", opt.val)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Exercise Frequency</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["None","1-2x/week","3-4x/week","5+/week"].map(f => (
                    <button key={f} style={chipBase(data.exerciseFreq === f)} onClick={() => update("exerciseFreq", f)}>{f}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Smoking Status</label>
                  <select value={data.smokingStatus} onChange={e => update("smokingStatus", e.target.value)} style={selectStyle}>
                    {["never","former","current"].map(s => <option key={s} value={s} style={{ background: "#1a1a1a" }}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Alcohol Use</label>
                  <select value={data.alcoholUse} onChange={e => update("alcoholUse", e.target.value)} style={selectStyle}>
                    {["none","occasional","moderate","heavy"].map(a => <option key={a} value={a} style={{ background: "#1a1a1a" }}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Sleep & Mental Health ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: T.cream, marginBottom: 2 }}>Sleep & Mental Health</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Sleep (hrs/night)</label>
                  <input type="number" min="1" max="14" placeholder="e.g. 7" value={data.sleepHours} onChange={e => update("sleepHours", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sleep Quality</label>
                  <select value={data.sleepQuality} onChange={e => update("sleepQuality", e.target.value)} style={selectStyle}>
                    {["poor","fair","normal","good","excellent"].map(q => <option key={q} value={q} style={{ background: "#1a1a1a" }}>{q.charAt(0).toUpperCase()+q.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>History of Depression?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{val:true,label:"Yes"},{val:false,label:"No"}].map(opt => (
                    <button key={String(opt.val)} style={yesNoStyle(data.depressionHistory === opt.val)} onClick={() => update("depressionHistory", opt.val)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>History of Anxiety?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{val:true,label:"Yes"},{val:false,label:"No"}].map(opt => (
                    <button key={String(opt.val)} style={yesNoStyle(data.anxietyHistory === opt.val)} onClick={() => update("anxietyHistory", opt.val)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ color: "rgba(96,165,250,0.8)", fontSize: 12, lineHeight: 1.6 }}>
                  💡 Sleep and mental health significantly affect cognitive test performance. This helps normalize your scores accurately.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Family History & Cognitive Profile ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: T.cream, marginBottom: 2 }}>Cognitive Profile</div>

              <div>
                <label style={labelStyle}>Family history of cognitive conditions?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{val:true,label:"Yes"},{val:false,label:"No"}].map(opt => (
                    <button key={String(opt.val)} style={yesNoStyle(data.familyHistory === opt.val)} onClick={() => update("familyHistory", opt.val)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {data.familyHistory && (
                <div>
                  <label style={labelStyle}>Which conditions? (select all that apply)</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["Alzheimer's","Dementia","Parkinson's","Stroke","Other"].map(c => (
                      <button key={c} style={chipBase(data.familyHistoryDetails.includes(c))} onClick={() => toggleArr("familyHistoryDetails", c)}>{c}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Existing neurological diagnosis?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{val:true,label:"Yes"},{val:false,label:"No"}].map(opt => (
                    <button key={String(opt.val)} style={yesNoStyle(data.existingDiagnosis === opt.val)} onClick={() => update("existingDiagnosis", opt.val)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Have you noticed any of the following recently?</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Memory lapses","Word-finding difficulty","Concentration issues","Slower reaction","Mood changes","Coordination issues","Sleep disturbances","None"].map(c => (
                    <button key={c} style={chipBase(data.cognitiveComplaints.includes(c))} onClick={() => toggleArr("cognitiveComplaints", c)}>{c}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Cognitive Baseline Date</label>
                <input type="date" value={data.baselineTestDate} onChange={e => update("baselineTestDate", e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>

              <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ color: T.green, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>✓ Profile Complete</div>
                <p style={{ color: T.creamFaint, fontSize: 12, lineHeight: 1.65 }}>
                  This profile enables Adjusted Risk = Raw Score × Age Weight × Education Weight × Family Risk Weight. Your data is private and encrypted.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 12 }}>
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} style={{ padding: "11px 22px", borderRadius: 50, border: `1px solid ${T.cardBorder}`, background: "transparent", color: T.creamDim, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
            ) : <div />}

            {step < STEP_COUNT ? (
              <Btn onClick={() => setStep(s => s + 1)}>Next →</Btn>
            ) : (
              <Btn onClick={finish} style={{ opacity: loading ? 0.6 : 1 }}>
                {loading ? "⏳ Saving…" : "Start Assessments →"}
              </Btn>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => onComplete({ profileComplete: true })} style={{ background: "none", border: "none", color: T.creamFaint, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Skip for now
            </button>
          </div>
        </DarkCard>
      </div>
    </div>
  );
}
