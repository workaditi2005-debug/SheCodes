import { useState } from "react";
import { T } from "../../utils/helpers";

const LIME = "#C8F135";

const USER_NAV = [
  { id: "dashboard",   label: "Overview",    icon: "◈" },
  {
    id: "assessments",
    label: "Assessments",
    icon: "◉",
    children: [
      { id: "speech",   label: "Speech Test",   icon: "🎙️" },
      { id: "memory",   label: "Memory Test",   icon: "🧠" },
      { id: "reaction", label: "Reaction Test", icon: "⚡" },
      { id: "stroop",   label: "Stroop Test",   icon: "🎨" },
      { id: "tap",      label: "Motor Tap",     icon: "🥁" },
    ],
  },
  { id: "results",     label: "Results",     icon: "◆" },
  { id: "progress",    label: "Progress",    icon: "↗" },
  { id: "games",       label: "Brain Games", icon: "🎮" },
  { id: "doctors",     label: "My Doctor",   icon: "🩺" },
  { id: "messages",    label: "Messages",    icon: "✉" },
];

const DOCTOR_NAV = [
  { id: "doctor-dashboard", label: "Dashboard", icon: "◈" },
  { id: "patients",         label: "Patients",  icon: "◉" },
  { id: "messages",         label: "Messages",  icon: "✉" },
];

export default function Sidebar({ role, page, setPage, setView }) {
  const nav = role === "doctor" ? DOCTOR_NAV : USER_NAV;
  const [assessOpen, setAssessOpen] = useState(
    ["assessments","speech","memory","reaction","stroop","tap"].includes(page)
  );

  return (
    <div style={{
      width: 220, minHeight: "100vh",
      background: "rgba(6,6,10,0.82)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100,
      boxShadow: "4px 0 30px rgba(0,0,0,0.4)",
    }}>
      <div
        style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", cursor: "pointer" }}
        onClick={() => setView("landing")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,rgba(232,64,64,0.9),rgba(200,36,36,0.95))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 18px rgba(232,64,64,0.45), inset 0 1px 0 rgba(255,255,255,0.15)" }}>⬡</div>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: T.cream, letterSpacing: -0.5 }}>NeuroAid</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {nav.map((item) => {
          if (item.children) {
            const anyChildActive = item.children.some(c => c.id === page);
            const isParentActive = page === item.id;
            const groupActive = isParentActive || anyChildActive;
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    setAssessOpen(o => !o);
                    if (!anyChildActive) setPage(item.id);
                  }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 12,
                    border: groupActive ? "1px solid rgba(232,64,64,0.25)" : "1px solid transparent",
                    background: groupActive ? "rgba(232,64,64,0.13)" : "transparent",
                    color: groupActive ? T.red : T.creamFaint,
                    fontWeight: groupActive ? 600 : 400,
                    fontSize: 13.5, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s", fontFamily: "'DM Sans',sans-serif",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, width: 18 }}>{item.icon}</span>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: 10, color: groupActive ? T.red : "rgba(255,255,255,0.25)",
                    transition: "transform 0.2s",
                    transform: assessOpen ? "rotate(90deg)" : "none",
                    display: "inline-block",
                  }}>▶</span>
                </button>

                {assessOpen && (
                  <div style={{ marginLeft: 12, marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                    {item.children.map(child => {
                      const active = page === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => setPage(child.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "8px 12px", borderRadius: 10,
                            border: active ? "1px solid " + LIME + "30" : "1px solid transparent",
                            background: active ? LIME + "12" : "transparent",
                            color: active ? LIME : "rgba(255,255,255,0.35)",
                            fontWeight: active ? 600 : 400,
                            fontSize: 12.5, cursor: "pointer", textAlign: "left",
                            transition: "all 0.15s", fontFamily: "'DM Sans',sans-serif",
                          }}
                        >
                          <span style={{ fontSize: 12, width: 18 }}>{child.icon}</span>
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12,
                border: active ? "1px solid rgba(232,64,64,0.25)" : "1px solid transparent",
                background: active ? "rgba(232,64,64,0.13)" : "transparent",
                backdropFilter: active ? "blur(8px)" : "none",
                color: active ? T.red : T.creamFaint,
                fontWeight: active ? 600 : 400,
                fontSize: 13.5, cursor: "pointer", textAlign: "left",
                transition: "all 0.15s", fontFamily: "'DM Sans',sans-serif",
              }}
            >
              <span style={{ fontSize: 14, width: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setView("logout")}
          style={{ background: "transparent", border: "none", color: T.creamFaint, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
        >
          ← Sign out
        </button>
      </div>
    </div>
  );
}
