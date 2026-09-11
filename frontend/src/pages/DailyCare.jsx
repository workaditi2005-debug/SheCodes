import { useEffect, useState } from "react";
import { toggleReminderStatus, getMemoryItems, getReminders } from "../services/api";
import { useI18n } from "../i18n/LanguageContext";
import { speak, playSelectSound } from "../utils/voice";

export default function DailyCare() {
  const { t, language } = useI18n();
  const [reminders, setReminders] = useState([]);
  const [memories, setMemories] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    Promise.all([getReminders(), getMemoryItems()])
      .then(([r, m]) => {
        setReminders(r || []);
        setMemories(m || []);
      })
      .catch(() => {});
  }, []);

  async function handleToggle(id, title, currentStatus) {
    playSelectSound();
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    
    // Optimistic UI update
    setReminders(list => list.map(r => r.id === id ? { ...r, status: nextStatus } : r));

    if (nextStatus === "completed") {
      const msg = `✓ Marked "${title}" complete.`;
      setToastMsg({ text: msg, isDone: true });
      speak(t("reminderDone", "Reminder marked complete."), language);
    } else {
      const msg = `↩ Marked "${title}" pending (unmarked).`;
      setToastMsg({ text: msg, isDone: false });
      speak(t("reminderUnmarked", "Reminder unmarked."), language);
    }

    setTimeout(() => setToastMsg(null), 3500);

    try {
      const updatedItem = await toggleReminderStatus(id, nextStatus);
      if (updatedItem) {
        setReminders(list => list.map(r => r.id === id ? { ...r, ...updatedItem, status: nextStatus } : r));
      }
    } catch (e) {
      // Revert if error
      setReminders(list => list.map(r => r.id === id ? { ...r, status: currentStatus } : r));
    }
  }

  const completedCount = reminders.filter(r => r.status === "completed").length;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(200,241,53,0.12)", border: "1px solid rgba(200,241,53,0.3)", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#c8f135", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            <span>🌿</span> Indigenous Assam Culturally Rooted Care Support
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, margin: "4px 0 8px", color: "#f8fafc" }}>{t("dailyCare")}</h1>
          <p style={{ color: "#aab3a3", fontSize: 14, margin: 0, maxWidth: 640 }}>
            {t("offlineCare")} Reminders and familiar personal memory items remain securely cached locally for continuous elder support.
          </p>
        </div>
      </div>

      {toastMsg && (
        <div style={{
          background: toastMsg.isDone ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)",
          border: `1px solid ${toastMsg.isDone ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
          color: toastMsg.isDone ? "#86efac" : "#fcd34d",
          borderRadius: 12,
          padding: "12px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          fontWeight: 700,
          animation: "slide-up 0.3s ease"
        }}>
          <span>{toastMsg.isDone ? "✓" : "↩"}</span> {toastMsg.text}
        </div>
      )}

      {/* Section 1: Medicine & Daily Reminders */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⏰</span> {t("reminders")}
          </h2>
          <span style={{ fontSize: 12, color: completedCount === reminders.length && reminders.length > 0 ? "#c8f135" : "#94a3b8", fontWeight: 700 }}>
            {completedCount} / {reminders.length} {t("completed")}
          </span>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {reminders.map(r => {
            const isDone = r.status === "completed";
            return (
              <article
                key={r.id}
                style={{
                  background: isDone ? "rgba(20,28,20,0.6)" : "rgba(21,26,20,0.9)",
                  border: `1px solid ${isDone ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 16,
                  padding: "20px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  transition: "all 0.2s ease",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: isDone ? "rgba(74,222,128,0.15)" : "rgba(200,241,53,0.12)", border: `1px solid ${isDone ? "#4ade8055" : "#c8f13544"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {r.title.toLowerCase().includes("donepezil") || r.title.toLowerCase().includes("medicine") ? "💊" : "💧"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#c8f135", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>{r.scheduled_time}</span>
                      <span style={{ color: "#64748b", fontSize: 11 }}>•</span>
                      <strong style={{ fontSize: 16, color: "#f8fafc", textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.75 : 1 }}>{r.title}</strong>
                    </div>
                    <div style={{ color: "#b4bdb0", fontSize: 13, marginTop: 4 }}>{r.description}</div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleToggle(r.id, r.title, r.status)}
                    title={isDone ? "Click to unmark as pending" : "Click to mark as complete"}
                    style={{
                      background: isDone ? "rgba(34,197,94,0.15)" : "#c8f135",
                      border: `1px solid ${isDone ? "rgba(34,197,94,0.4)" : "none"}`,
                      color: isDone ? "#86efac" : "#0a0d0a",
                      borderRadius: 12,
                      padding: "9px 16px",
                      fontWeight: 800,
                      fontSize: 12.5,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: isDone ? "none" : "0 0 16px rgba(200,241,53,0.3)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => {
                      if (isDone) {
                        e.currentTarget.style.background = "rgba(239,68,68,0.2)";
                        e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                        e.currentTarget.style.color = "#fca5a5";
                      } else {
                        e.currentTarget.style.background = "#d9f953";
                        e.currentTarget.style.transform = "scale(1.03)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (isDone) {
                        e.currentTarget.style.background = "rgba(34,197,94,0.15)";
                        e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
                        e.currentTarget.style.color = "#86efac";
                      } else {
                        e.currentTarget.style.background = "#c8f135";
                        e.currentTarget.style.transform = "none";
                      }
                    }}
                  >
                    {isDone ? `✓ ${t("completed")} (Unmark)` : t("complete")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 2: Personal Memory Bank */}
      <section style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🧠</span> {t("memories")} (Personal Memory Bank)
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0" }}>
              Personalized anchors rooted in local Assamese culture to promote emotional comfort and associative recall.
            </p>
          </div>
          <span style={{ fontSize: 12, color: "#c8f135", background: "rgba(200,241,53,0.08)", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(200,241,53,0.2)" }}>
            {memories.length} Anchors Loaded
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {memories.map(m => (
            <article
              key={m.id}
              style={{
                background: "rgba(21,26,20,0.85)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                padding: 22,
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #c8f135, transparent)" }} />
              <div style={{ fontSize: 38, marginBottom: 12, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}>
                {m.image_emoji || "🌸"}
              </div>
              <div style={{ display: "inline-block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#c8f135", background: "rgba(200,241,53,0.1)", padding: "3px 8px", borderRadius: 6, marginBottom: 8, letterSpacing: 0.5 }}>
                {m.category || "Memory Anchor"}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#f8fafc", marginBottom: 6 }}>{m.name}</div>
              <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>
                {m.relationship_or_context}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
