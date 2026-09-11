import { useEffect } from "react";
import { playCelebrationSound } from "../../utils/gameAudio";

const LIME = "#C8F135";

export default function GameCompletionModal({
  isOpen,
  result,
  onPlayAgain,
  onExit,
  gameTitle = "Cognitive Game",
}) {
  useEffect(() => {
    if (isOpen) {
      playCelebrationSound();
    }
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const stars = result.stars || 3;
  const score = Math.round(result.score || 85);
  const timeSec = Math.round(result.duration_seconds || result.duration || 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "linear-gradient(180deg, #181c16 0%, #0c0f0a 100%)",
          border: `2px solid ${LIME}55`,
          borderRadius: 28,
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 50px ${LIME}22`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top celebratory glow */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 220,
            height: 120,
            background: `radial-gradient(circle, ${LIME}44 0%, transparent 70%)`,
            pointerEvents:"none",
          }}
        />

        {/* Cognitive Domain Tag */}
        {result.cognitive_domain && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: 99,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 12,
              fontWeight: 700,
              color: "#a3e635",
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            ✦ {result.cognitive_domain}
          </div>
        )}

        {/* Title */}
        <h2
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 900,
            fontSize: 28,
            color: "#fff",
            marginBottom: 6,
          }}
        >
          Session Completed!
        </h2>
        <p style={{ color: "#9ca3af", fontSize: 15, marginBottom: 20 }}>
          {gameTitle}
        </p>

        {/* Star Rating Display */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[1, 2, 3].map((starIndex) => {
            const isFilled = starIndex <= stars;
            return (
              <span
                key={starIndex}
                style={{
                  fontSize: 48,
                  filter: isFilled
                    ? "drop-shadow(0 0 16px #fbbf24)"
                    : "grayscale(100%) opacity(30%)",
                  transform: isFilled ? "scale(1.1)" : "scale(0.9)",
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  display: "inline-block",
                }}
              >
                ⭐
              </span>
            );
          })}
        </div>

        {/* Encouraging Feedback Message */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 16,
              color: "#f3f4f6",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {result.feedback_message || "Wonderful job! Regular cognitive stimulation helps maintain mental sharpness."}
          </p>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: "12px 8px",
            }}
          >
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Score
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: LIME }}>
              {score}%
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: "12px 8px",
            }}
          >
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Duration
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa" }}>
              {timeSec}s
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: "12px 8px",
            }}
          >
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Rating
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>
              {stars}/3 Stars
            </div>
          </div>
        </div>

        {/* Adaptive Difficulty Adjustment & Explainability */}
        {result.adaptive_difficulty && (
          <div
            style={{
              background: "rgba(200,241,53,0.05)",
              border: "1px solid rgba(200,241,53,0.22)",
              borderRadius: 18,
              padding: "16px 18px",
              marginBottom: 24,
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: LIME, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Adaptive Engine Recommendation
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background:
                    result.adaptive_difficulty.adjustment === "increase"
                      ? "rgba(52,211,153,0.2)"
                      : result.adaptive_difficulty.adjustment === "decrease"
                      ? "rgba(96,165,250,0.2)"
                      : "rgba(245,158,11,0.2)",
                  color:
                    result.adaptive_difficulty.adjustment === "increase"
                      ? "#34d399"
                      : result.adaptive_difficulty.adjustment === "decrease"
                      ? "#60a5fa"
                      : "#f59e0b",
                  border: "1px solid currentColor",
                }}
              >
                Level {result.adaptive_difficulty.previous_level} → Level {result.adaptive_difficulty.new_level}
              </span>
            </div>

            {/* Explainability Reasons */}
            {result.adaptive_difficulty.reason && result.adaptive_difficulty.reason.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {result.adaptive_difficulty.reason.map((r, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#e5e7eb",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "3px 8px",
                    }}
                  >
                    ✓ {r}
                  </span>
                ))}
              </div>
            )}

            {result.adaptive_difficulty.clinical_rationale && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, fontStyle: "italic" }}>
                {result.adaptive_difficulty.clinical_rationale}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
          {result.adaptive_difficulty && result.adaptive_difficulty.new_level !== result.adaptive_difficulty.previous_level ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  if (onPlayAgain) onPlayAgain(result.adaptive_difficulty.new_level);
                }}
                style={{
                  flex: 1.3,
                  padding: "16px 14px",
                  borderRadius: 16,
                  background: LIME,
                  border: "none",
                  color: "#080808",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: `0 8px 24px ${LIME}44`,
                  transition: "transform 0.15s ease",
                }}
              >
                Play Level {result.adaptive_difficulty.new_level} (Recommended) 🚀
              </button>
              <button
                onClick={() => {
                  if (onPlayAgain) onPlayAgain(result.adaptive_difficulty.previous_level);
                }}
                style={{
                  flex: 0.9,
                  padding: "16px 12px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Replay Lvl {result.adaptive_difficulty.previous_level} ↻
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const nextLvl = result.adaptive_difficulty?.new_level;
                if (onPlayAgain) onPlayAgain(nextLvl);
              }}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: 16,
                background: LIME,
                border: "none",
                color: "#080808",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: `0 8px 24px ${LIME}44`,
                transition: "transform 0.15s ease",
              }}
            >
              Play Again ↻
            </button>
          )}

          <button
            onClick={onExit}
            style={{
              width: "100%",
              padding: "12px 18px",
              borderRadius: 14,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#9ca3af",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
          >
            ← Back to Brain Games
          </button>
        </div>
      </div>
    </div>
  );
}
