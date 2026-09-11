import { useState } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn, Stars } from "../components/RiskDashboard";

export default function DisclaimerPage({ setView, onAccept }) {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);

  const allChecked = checked1 && checked2 && checked3;

  const Checkbox = ({ checked, onChange, label }) => (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer",
        padding: "14px 18px", borderRadius: 12,
        background: checked ? "rgba(232,64,64,0.08)" : T.bg3,
        border: `1px solid ${checked ? "rgba(232,64,64,0.35)" : T.cardBorder}`,
        marginBottom: 12, transition: "all 0.2s",
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
        background: checked ? T.red : "transparent",
        border: `2px solid ${checked ? T.red : T.cardBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: "white", transition: "all 0.2s",
      }}>{checked ? "✓" : ""}</div>
      <span style={{ fontSize: 14, color: T.creamDim, lineHeight: 1.6 }}>{label}</span>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center",
      justifyContent: "center", padding: "32px 24px", fontFamily: "'DM Sans',sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <Stars count={40} />
      <div style={{ width: "100%", maxWidth: 600, position: "relative", zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 28, margin: "0 auto 20px",
          }}>⚕️</div>
          <h1 style={{
            fontFamily: "'Instrument Serif',serif", fontSize: 30, color: T.cream,
            fontWeight: 400, letterSpacing: -0.8, marginBottom: 10,
          }}>Medical Disclaimer</h1>
          <p style={{ color: T.creamFaint, fontSize: 14, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            Before you begin, please read and confirm you understand the nature of this tool.
          </p>
        </div>

        {/* Warning box */}
        <div style={{
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 14, padding: "20px 24px", marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: 14 }}>Important Notice</span>
          </div>
          <p style={{ color: T.creamDim, fontSize: 13, lineHeight: 1.75, margin: 0 }}>
            NeuroAid is a <strong style={{ color: T.cream }}>behavioral screening tool</strong>, not a medical diagnostic device. It uses
            cognitive performance metrics to estimate risk patterns. Results are <strong style={{ color: T.cream }}>not a diagnosis</strong> and
            should never replace professional medical evaluation. Always consult a qualified neurologist
            or physician for clinical assessment.
          </p>
        </div>

        {/* What it does section */}
        <DarkCard style={{ padding: 24, marginBottom: 24 }} hover={false}>
          <div style={{ fontWeight: 700, color: T.cream, fontSize: 14, marginBottom: 16 }}>What NeuroAid Does</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "✅", text: "Measures cognitive performance", ok: true },
              { icon: "✅", text: "Identifies behavioral risk patterns", ok: true },
              { icon: "✅", text: "Tracks changes over time", ok: true },
              { icon: "✅", text: "Provides actionable recommendations", ok: true },
              { icon: "❌", text: "Diagnoses medical conditions", ok: false },
              { icon: "❌", text: "Replaces clinical evaluation", ok: false },
              { icon: "❌", text: "Prescribes medication", ok: false },
              { icon: "❌", text: "Provides definitive risk", ok: false },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: item.ok ? "rgba(34,197,94,0.07)" : "rgba(232,64,64,0.07)",
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: item.ok ? T.green : T.creamFaint }}>{item.text}</span>
              </div>
            ))}
          </div>
        </DarkCard>

        {/* Who it's for */}
        <DarkCard style={{ padding: 24, marginBottom: 28 }} hover={false}>
          <div style={{ fontWeight: 700, color: T.cream, fontSize: 14, marginBottom: 14 }}>Who This Tool Is For</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              "👴 Adults aged 40+",
              "🧬 Family history of cognitive decline",
              "🔍 Concerned individuals seeking awareness",
              "📊 Those wanting to track brain health",
              "🤝 Caregivers supporting loved ones",
            ].map((tag, i) => (
              <span key={i} style={{
                padding: "6px 14px", borderRadius: 20,
                background: "rgba(96,165,250,0.1)", color: T.blue,
                fontSize: 12, fontWeight: 600, border: "1px solid rgba(96,165,250,0.2)",
              }}>{tag}</span>
            ))}
          </div>
        </DarkCard>

        {/* Checkboxes */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: T.creamFaint, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>
            Please confirm the following
          </div>
          <Checkbox
            checked={checked1} onChange={setChecked1}
            label="I understand that NeuroAid is a screening tool only and does NOT diagnose medical conditions, Alzheimer's, dementia, Parkinson's, or any other neurological disorder."
          />
          <Checkbox
            checked={checked2} onChange={setChecked2}
            label="I confirm that I am 18 years of age or older, and I will consult a qualified healthcare professional if I have any medical concerns."
          />
          <Checkbox
            checked={checked3} onChange={setChecked3}
            label="I understand that cognitive screening results may have false positives or negatives, and I should not rely solely on this tool for health decisions."
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setView("landing")}
            style={{
              flex: 1, padding: "14px", borderRadius: 12,
              background: "transparent", border: `1px solid ${T.cardBorder}`,
              color: T.creamFaint, fontSize: 14, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >← Go Back</button>
          <button
            disabled={!allChecked}
            onClick={onAccept}
            style={{
              flex: 2, padding: "14px", borderRadius: 12,
              background: allChecked ? T.red : T.bg3,
              border: `1px solid ${allChecked ? T.red : T.cardBorder}`,
              color: allChecked ? "white" : T.creamFaint,
              fontSize: 14, fontWeight: 700, cursor: allChecked ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: allChecked ? `0 0 20px rgba(232,64,64,0.3)` : "none",
              transition: "all 0.3s",
            }}
          >{allChecked ? "✓ I Understand — Begin Assessment" : "Check all boxes to continue"}</button>
        </div>

        <p style={{ textAlign: "center", color: T.creamFaint, fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
          Your data is encrypted and processed locally. We do not sell or share your cognitive data.
        </p>
      </div>
    </div>
  );
}
