import { T } from "../utils/theme";
import { DarkCard, Btn } from "../components/RiskDashboard";

export default function AboutPage({ setView }) {
  return (
    <div style={{ background: T.bg, color: T.cream, fontFamily: "'DM Sans',sans-serif", minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 60px", borderBottom: `1px solid ${T.cardBorder}`, background: "rgba(10,10,10,0.9)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => setView("landing")} style={{ background: "none", border: "none", fontFamily: "'Instrument Serif',serif", fontSize: 20, color: T.cream, cursor: "pointer" }}>NeuroAid</button>
        <Btn small onClick={() => setView("login")}>Get Started →</Btn>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 40px" }}>
        <div style={{ color: T.red, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>About</div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 52, fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 40 }}>Understanding<br /><em>Neurological Decline</em></h1>
        {[
          { title: "Alzheimer's Disease", emoji: "🧠", body: "Alzheimer's accounts for 60–80% of dementia cases. Early detection through speech pattern changes, word-finding difficulties, and reaction delays can significantly alter the disease's trajectory." },
          { title: "Parkinson's Disease", emoji: "🫀", body: "Parkinson's affects movement and cognition. Speech changes — hypophonia, monotone pitch, and stuttering — are among the earliest markers. Reaction time variability is a core metric." },
          { title: "Frontotemporal Dementia", emoji: "🔬", body: "FTD primarily affects behavior and language. Speech pattern disruption and word-finding pauses appear early and are highly detectable through AI-based analysis." },
          { title: "How Speech Changes in Neurological Disorders", emoji: "🎙️", body: "Research from MIT, Mayo Clinic, and Stanford shows automated speech analysis can detect early cognitive decline with 85%+ accuracy — often 2–5 years before clinical diagnosis." },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: `1px solid ${T.cardBorder}` }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, fontWeight: 400, color: T.cream, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}><span>{s.emoji}</span>{s.title}</h2>
            <p style={{ color: T.creamFaint, fontSize: 15, lineHeight: 1.85 }}>{s.body}</p>
          </div>
        ))}
        <DarkCard style={{ padding: 32 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: T.cream, marginBottom: 10 }}>Ready to start screening?</div>
          <p style={{ color: T.creamFaint, marginBottom: 20, fontSize: 14 }}>Built on peer-reviewed research and validated cognitive benchmarks.</p>
          <Btn onClick={() => setView("login")}>Start Your Assessment →</Btn>
        </DarkCard>
      </div>
    </div>
  );
}
