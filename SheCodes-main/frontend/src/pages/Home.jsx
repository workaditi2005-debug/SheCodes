import { T } from "../utils/theme";
import { Stars, DarkCard, Btn, MiniChart } from "../components/RiskDashboard";

// Glass FloatCard — enhanced
const FloatCard = ({ children, style }) => (
  <div style={{
    background: "rgba(14,14,22,0.68)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 18, padding: "12px 16px",
    boxShadow: "0 24px 72px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.20)",
    backdropFilter: "blur(28px) saturate(170%)", WebkitBackdropFilter: "blur(28px) saturate(170%)",
    position: "relative",
    ...style,
  }}>
    <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents:"none", borderRadius:99 }} />
    {children}
  </div>
);

export default function Home({ setView }) {
  return (
    <div style={{ background: T.bg, color: T.cream, fontFamily: "'DM Sans',sans-serif" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 60px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(5,5,10,0.78)",
        backdropFilter: "blur(36px) saturate(150%)", WebkitBackdropFilter: "blur(36px) saturate(150%)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.06), 0 4px 40px rgba(0,0,0,0.45)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,rgba(232,64,64,0.9),rgba(200,36,36,0.95))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px rgba(232,64,64,0.45), inset 0 1px 0 rgba(255,255,255,0.15)` }}>⬡</div>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, letterSpacing: -0.5 }}>NeuroAid</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {["Guides","Support"].map(l => (
            <button key={l} style={{ background: "none", border: "none", color: T.creamFaint, fontWeight: 500, cursor: "pointer", fontSize: 14, padding: "8px 14px", borderRadius: 8, fontFamily: "'DM Sans',sans-serif", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = T.cream} onMouseLeave={e => e.target.style.color = T.creamFaint}>{l}</button>
          ))}
          <button onClick={() => setView("about")} style={{ background: "none", border: "none", color: T.creamFaint, fontWeight: 700, cursor: "pointer", fontSize: 14, padding: "8px 14px", borderRadius: 8, fontFamily: "'DM Sans',sans-serif", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = T.cream} onMouseLeave={e => e.target.style.color = T.creamFaint}>About</button>
          <Btn small onClick={() => setView("login")}>Start Free Assessment</Btn>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "radial-gradient(ellipse 100% 75% at 50% -15%, rgba(200,40,40,0.18) 0%, transparent 65%), #07070b" }}>
        <Stars count={90} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(220,50,50,0.22) 0%, rgba(150,30,30,0.08) 40%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "glow-pulse 5s ease-in-out infinite", pointerEvents: "none", filter: "blur(1px)" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,80,220,0.10) 0%, transparent 70%)", top: "15%", left: "10%", animation: "glow-pulse 7s ease-in-out infinite 2s", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", bottom: "15%", right: "12%", animation: "glow-pulse 6s ease-in-out infinite 1s", pointerEvents: "none" }} />

        {/* Left float cards */}
        <FloatCard style={{ position: "absolute", left: "8%", top: "25%", animation: "floatL 7s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(26,58,26,0.7)", border: "1px solid rgba(74,222,128,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🎙️</div>
            <div><div style={{ fontSize: 10, color: T.creamFaint }}>Speech Rate</div><div style={{ fontSize: 13, fontWeight: 700, color: T.cream }}>142 wpm</div><div style={{ fontSize: 10, color: T.green }}>● Normal</div></div>
          </div>
        </FloatCard>
        <FloatCard style={{ position: "absolute", left: "6%", top: "46%", animation: "floatL 9s ease-in-out infinite 1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(26,26,58,0.7)", border: "1px solid rgba(96,165,250,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🧠</div>
            <div><div style={{ fontSize: 10, color: T.creamFaint }}>Memory Recall</div><div style={{ fontSize: 13, fontWeight: 700, color: T.cream }}>9 / 12 words</div><div style={{ fontSize: 10, color: T.green }}>● 75% accuracy</div></div>
          </div>
        </FloatCard>
        <FloatCard style={{ position: "absolute", left: "5%", top: "65%", animation: "floatL 8s ease-in-out infinite 0.5s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(42,26,10,0.7)", border: "1px solid rgba(245,158,11,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
            <div><div style={{ fontSize: 10, color: T.creamFaint }}>Reaction Time</div><div style={{ fontSize: 13, fontWeight: 700, color: T.cream }}>284 ms avg</div><div style={{ fontSize: 10, color: T.amber }}>● Watch trend</div></div>
          </div>
        </FloatCard>

        {/* Right float cards */}
        <FloatCard style={{ position: "absolute", right: "7%", top: "22%", animation: "floatR 8s ease-in-out infinite 0.5s", minWidth: 130 }}>
          <div style={{ fontSize: 10, color: T.creamFaint, marginBottom: 4 }}>Cognitive Score</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, lineHeight: 1 }}>74</div>
          <div style={{ fontSize: 10, color: T.green, marginTop: 4 }}>● Low Risk</div>
        </FloatCard>
        <FloatCard style={{ position: "absolute", right: "6%", top: "42%", animation: "floatR 6s ease-in-out infinite 2s", minWidth: 150 }}>
          <div style={{ fontSize: 10, color: T.creamFaint, marginBottom: 6 }}>Assessment Complete ✓</div>
          <div style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: T.green, textAlign: "center" }}>View Full Results →</div>
        </FloatCard>
        <FloatCard style={{ position: "absolute", right: "8%", top: "61%", animation: "floatR 7s ease-in-out infinite 1s" }}>
          <div style={{ fontSize: 10, color: T.creamFaint, marginBottom: 2 }}>Pause Frequency</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.cream }}>0.8 / min</div>
          <div style={{ fontSize: 10, color: T.green }}>● Normal</div>
        </FloatCard>
        <FloatCard style={{ position: "absolute", right: "5%", top: "76%", animation: "floatR 9s ease-in-out infinite 3s" }}>
          <div style={{ fontSize: 10, color: T.creamFaint, marginBottom: 2 }}>Filler Words</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.cream }}>3 detected</div>
          <div style={{ fontSize: 10, color: T.amber }}>● Monitor</div>
        </FloatCard>

        {/* Phone mockup — glass shell */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <div style={{ width: 220, margin: "0 auto", background: "rgba(16,16,26,0.78)", backdropFilter: "blur(36px) saturate(160%)", WebkitBackdropFilter: "blur(36px) saturate(160%)", borderRadius: 36, padding: "16px 14px 24px", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 50px 120px rgba(0,0,0,0.68), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 60px rgba(220,50,50,0.06)", animation: "float 6s ease-in-out infinite" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "0 4px" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.cream }}>9:41</span>
              <span style={{ fontSize: 10, color: T.creamFaint }}>◀</span>
            </div>
            <div style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(8px)", borderRadius: 24, padding: "18px 14px", minHeight: 280, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 14, textAlign: "center" }}>My Score</div>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 56, color: "#111", lineHeight: 1 }}>74</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Cognitive Score</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e8f8ee", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#1a7a3a", marginTop: 6 }}>● Low Risk</div>
              </div>
              {[{label:"Speech",v:74,c:"#e84040"},{label:"Memory",v:82,c:"#22c55e"},{label:"Reaction",v:68,c:"#3b82f6"}].map(d => (
                <div key={d.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 10, color: "#666" }}>{d.label}</span><span style={{ fontSize: 10, fontWeight: 700, color: "#111" }}>{d.v}</span></div>
                  <div style={{ height: 3, background: "#e0e0e0", borderRadius: 2 }}><div style={{ height: "100%", width: `${d.v}%`, background: d.c, borderRadius: 2 }} /></div>
                </div>
              ))}
              <div style={{ marginTop: 14, background: "linear-gradient(135deg,#e84040,#c02828)", borderRadius: 12, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 12px rgba(232,64,64,0.35)" }}>Start Assessment →</div>
            </div>
          </div>
          <div style={{ marginTop: 60, maxWidth: 620, padding: "0 24px" }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(38px,5vw,62px)", fontWeight: 400, lineHeight: 1.08, letterSpacing: -2, color: T.cream }}>
              Reimagine How You<br />Interact With <span style={{ fontStyle: "italic" }}>Your Brain</span>
            </h1>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: "rgba(10,10,14,0.96)", backdropFilter: "blur(40px)", padding: "80px 60px", borderRadius: "24px 24px 0 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 60, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, fontWeight: 400, letterSpacing: -1.2, lineHeight: 1.15, color: T.cream, marginBottom: 16 }}>Your ultimate cognitive health platform, packed with features to simplify your brain health journey</h2>
            </div>
            <div style={{ flex: 1, paddingTop: 6 }}>
              <p style={{ color: T.creamDim, fontSize: 15, lineHeight: 1.75, marginBottom: 20 }}>From advanced speech biomarkers to seamless memory tests, we've designed everything to elevate your cognitive screening experience.</p>
              <Btn variant="cream" onClick={() => setView("login")}>↓ Get started</Btn>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 48 }}>
            <DarkCard style={{ padding: 32, gridRow: "span 2" }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, marginBottom: 20, border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,rgba(232,64,64,0.85),rgba(200,36,36,0.9))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, boxShadow: "0 4px 12px rgba(232,64,64,0.30)" }}>⬡</div>
                  <div><div style={{ fontSize: 12, color: T.creamDim, marginBottom: 2 }}>Your weekly assessment is ready 🧠</div><div style={{ fontSize: 11, color: T.creamFaint }}>Tap to begin — takes ~8 minutes</div></div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>📊</div>
                  <div style={{ fontSize: 11, color: T.creamDim }}>Score improved · <span style={{ color: T.green }}>+4 pts this week</span></div>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.cream, marginBottom: 10 }}>Push Notifications</div>
              <div style={{ color: T.creamFaint, fontSize: 14, lineHeight: 1.7 }}>Stay on top of your cognitive health with instant alerts for all assessments and score changes.</div>
            </DarkCard>
            <DarkCard style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,215,0,0.9), rgba(184,134,11,0.85))", boxShadow: "0 0 40px rgba(255,215,0,0.20), 0 0 80px rgba(255,215,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, border: "1px solid rgba(255,215,0,0.12)" }}>⬡</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.cream, marginBottom: 6 }}>Effortless Assessments</div>
              <div style={{ color: T.creamFaint, fontSize: 14, lineHeight: 1.7 }}>Complete cognitive screenings with a user-friendly, guided interface.</div>
            </DarkCard>
            <DarkCard style={{ padding: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.cream, marginBottom: 10 }}>Longitudinal Tracking</div>
              <div style={{ color: T.creamFaint, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>Score trends over months reveal trajectories invisible to single-point assessments.</div>
              <MiniChart data={[58,61,64,60,67,70,74]} color={T.red} height={50} />
            </DarkCard>
          </div>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section style={{ background: "rgba(10,10,14,0.97)", padding: "80px 60px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, fontWeight: 400, letterSpacing: -1.2, color: T.cream, marginBottom: 10 }}>Explore, create, and assess<br /><em style={{ color: T.creamDim }}>seamlessly in the cognitive ecosystem.</em></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 48, marginBottom: 48 }}>
            {[
              { bg: "linear-gradient(135deg,rgba(42,10,10,0.8),rgba(107,26,26,0.7))", imgs: ["🎙️","🧠"], label: "Assess Speech & Memory with AI-powered biomarkers" },
              { bg: "linear-gradient(135deg,rgba(10,26,42,0.8),rgba(26,58,107,0.7))", imgs: ["⚡","📊","🩺"], label: "Track, analyze, and share longitudinal results" },
              { bg: "linear-gradient(135deg,rgba(26,10,42,0.8),rgba(107,26,107,0.7))", imgs: ["⬡"], label: "Doctor-verified reports and clinical interpretation", star: true },
            ].map((c, i) => (
              <DarkCard key={i} style={{ padding: 20, textAlign: "left" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {c.imgs.map((img, j) => <div key={j} style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{img}</div>)}
                  {c.star && <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,rgba(42,26,10,0.8),rgba(139,69,19,0.7))", border: "1px solid rgba(255,215,0,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✦</div>}
                </div>
                <div style={{ fontSize: 13, color: T.creamDim, lineHeight: 1.6 }}>{c.label}</div>
              </DarkCard>
            ))}
          </div>
          <div style={{ display: "flex", gap: 60, alignItems: "center", textAlign: "left", marginTop: 40 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, fontWeight: 400, letterSpacing: -1.2, lineHeight: 1.2, color: T.cream, marginBottom: 16 }}>Privacy that lets you<br /><em>sleep easy</em></h2>
              <p style={{ color: T.creamDim, fontSize: 14, lineHeight: 1.75 }}>Your cognitive data is encrypted end-to-end and never sold. Only you and your authorized doctors can access your results.</p>
            </div>
            <DarkCard style={{ flex: 1, padding: 24 }} hover={false}>
              <div style={{ fontSize: 12, color: T.creamFaint, marginBottom: 8 }}>Message</div>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 13, color: T.creamDim, fontStyle: "italic" }}>"I love NeuroAid"</div>
              <div style={{ fontSize: 12, color: T.creamFaint, marginBottom: 8 }}>From</div>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 12, fontSize: 13, color: T.cream }}>Dr. Elena Marsh<span style={{ color: T.green, fontSize: 11 }}> · Verified</span></div>
            </DarkCard>
          </div>
        </div>
      </section>

      {/* GATEWAY */}
      <section style={{ background: "rgba(10,6,20,0.98)", padding: "80px 60px", textAlign: "center", position: "relative", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", bottom: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(232,130,40,0.13) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, fontWeight: 400, letterSpacing: -1.2, color: T.cream, marginBottom: 10 }}>Your comprehensive gateway<br />to cognitive health tools</h2>
          <p style={{ color: T.creamFaint, fontSize: 14, marginBottom: 56 }}>Access all 6 cognitive screening tools, all in one secure place.</p>
          {[[
            { label: "Speech AI",  bg: "linear-gradient(135deg,rgba(123,32,32,0.85),rgba(232,64,64,0.80))", icon: "🎙️", rot: "-8deg", glow: "rgba(232,64,64,0.28)" },
            { label: "MemoryTest", bg: "linear-gradient(135deg,rgba(26,58,139,0.85),rgba(64,96,208,0.80))", icon: "🧠", rot: "0deg",  glow: "rgba(64,96,208,0.28)" },
            { label: "ReactionX",  bg: "linear-gradient(135deg,rgba(26,96,64,0.85),rgba(40,192,112,0.80))", icon: "⚡", rot: "8deg",  glow: "rgba(40,192,112,0.28)" },
          ],[
            { label: "Progress",  bg: "linear-gradient(135deg,rgba(42,96,32,0.85),rgba(80,176,48,0.80))",  icon: "📈", rot: "-6deg", glow: "rgba(80,176,48,0.28)" },
            { label: "DocPortal", bg: "linear-gradient(135deg,rgba(90,32,128,0.85),rgba(144,64,208,0.80))", icon: "🩺", rot: "0deg",  glow: "rgba(144,64,208,0.28)" },
            { label: "Reports",   bg: "linear-gradient(135deg,rgba(26,64,80,0.85),rgba(32,144,176,0.80))",  icon: "📄", rot: "6deg",  glow: "rgba(32,144,176,0.28)" },
          ]].map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 32 }}>
              {row.map(t => (
                <div key={t.label} onClick={() => setView("login")}
                  style={{ width: 140, height: 160, borderRadius: 24, background: t.bg, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transform: `rotate(${t.rot})`, boxShadow: `0 16px 50px rgba(0,0,0,0.5), 0 0 28px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.14)`, border: "1px solid rgba(255,255,255,0.13)", transition: "transform 0.25s, box-shadow 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06) rotate(0deg)"; e.currentTarget.style.boxShadow = `0 24px 60px rgba(0,0,0,0.6), 0 0 48px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.20)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${t.rot})`; e.currentTarget.style.boxShadow = `0 16px 50px rgba(0,0,0,0.5), 0 0 28px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.14)`; }}>
                  <div style={{ fontSize: 40 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 0.5 }}>{t.label}</div>
                </div>
              ))}
            </div>
          ))}
          <Btn variant="ghost" style={{ borderRadius: 12 }}>↓ More</Btn>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", background: T.bg, padding: "120px 60px", textAlign: "center", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <Stars count={90} />
        <div style={{ position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)", width: 700, height: 350, background: "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(180,100,20,0.16) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(28px,4vw,50px)", fontWeight: 400, letterSpacing: -1.5, color: T.cream, lineHeight: 1.2, marginBottom: 20 }}>Experience cognitive health like never<br />before with NeuroAid</h2>
          <Btn onClick={() => setView("login")} style={{ fontSize: 16, padding: "14px 32px", marginBottom: 24 }}>⬡ Start Free Assessment</Btn>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 }}>
            {["🌐","📱","💻"].map((e, i) => <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{e}</div>)}
          </div>
          <div style={{ color: T.creamFaint, fontSize: 12 }}>Available on web, iOS & Android</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "rgba(6,6,10,0.80)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "40px 60px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40 }}>
        <div>
          {["Home","Guides","Support","About"].map(l => (
            <button key={l} onClick={() => l === "About" && setView("about")} style={{ display: "block", background: "none", border: "none", color: T.creamFaint, fontSize: 13, cursor: "pointer", marginBottom: 8, fontFamily: "'DM Sans',sans-serif", textAlign: "left", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = T.cream} onMouseLeave={e => e.target.style.color = T.creamFaint}>{l}</button>
          ))}
        </div>
        <div>
          <div style={{ color: T.creamDim, fontSize: 13, marginBottom: 12 }}>Stay in touch</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="name@email.com" className="glass-input" style={{ borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", width: 200, outline: "none" }} />
            <Btn small>↗ Subscribe</Btn>
          </div>
        </div>
        <div style={{ color: T.creamFaint, fontSize: 11, lineHeight: 1.7, maxWidth: 300 }}>
          <strong style={{ color: T.creamDim }}>Medical Disclaimer:</strong> NeuroAid is a screening tool, not a diagnostic device. Always consult a qualified neurologist.
        </div>
      </footer>
    </div>
  );
}