import { useState, useEffect, useRef } from "react";
import GameCompletionModal from "./GameCompletionModal";
import { isSoundMuted, setSoundMuted, playTapSound } from "../../utils/gameAudio";

const LIME = "#C8F135";

export default function GameShell({
  gameId,
  title,
  domainLabel = "Cognitive Focus",
  accentColor = LIME,
  instructionText = "",
  difficultyLevel = 1,
  onDifficultyChange,
  timerSeconds = 0,
  isTimerRunning = true,
  movesCount = 0,
  mistakesCount = 0,
  onRestart,
  onHint,
  onBack,
  completionResult = null,
  isCompleted = false,
  onPlayAgain,
  children,
}) {
  const [muted, setMuted] = useState(isSoundMuted());

  function handleMuteToggle() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  }

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 40 }}>
      {/* ── Top Navigation Bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => {
            playTapSound();
            if (onBack) onBack();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#e5e7eb",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          ← Exit to Games
        </button>

        {/* Cognitive Domain Tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 99,
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}44`,
            color: accentColor,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          <span>✦</span> {domainLabel}
        </div>

        {/* Sound Toggle Button */}
        <button
          onClick={handleMuteToggle}
          title={muted ? "Unmute sounds" : "Mute sounds"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#e5e7eb",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* ── Game Header & Difficulty Select ── */}
      <div
        style={{
          background: "rgba(14,16,12,0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 22,
          padding: "20px 24px",
          marginBottom: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(22px, 3vw, 32px)",
                color: "#fff",
                letterSpacing: "-0.5px",
                margin: 0,
              }}
            >
              {title}
            </h1>
          </div>

          {/* Difficulty Level Tabs */}
          {onDifficultyChange && (
            <div
              style={{
                display: "inline-flex",
                background: "rgba(0,0,0,0.5)",
                padding: 4,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                gap: 4,
                flexWrap: "wrap",
              }}
            >
              {[
                { lvl: 1, label: "Easy" },
                { lvl: 2, label: "Medium" },
                { lvl: 3, label: "Hard" },
                { lvl: 4, label: "Pro" },
                { lvl: 5, label: "Advance" },
              ].map(({ lvl, label }) => {
                const isActive = difficultyLevel === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      playTapSound();
                      onDifficultyChange(lvl);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 10,
                      border: "none",
                      background: isActive ? accentColor : "transparent",
                      color: isActive ? "#080808" : "#9ca3af",
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>Lvl {lvl}</span>
                    <span style={{ fontSize: 10, opacity: isActive ? 0.9 : 0.6 }}>({label})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Metrics Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 12,
            fontSize: 14,
            color: "#9ca3af",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>⏱</span>
            <span style={{ color: "#fff", fontWeight: 800 }}>
              {formatTime(timerSeconds)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>🎯 Moves:</span>
            <span style={{ color: "#fff", fontWeight: 800 }}>{movesCount}</span>
          </div>

          {mistakesCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠️ Retries:</span>
              <span style={{ color: "#f87171", fontWeight: 800 }}>
                {mistakesCount}
              </span>
            </div>
          )}

          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={() => {
                playTapSound();
                if (onRestart) onRestart();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              ↻ Restart
            </button>
          </div>
        </div>
      </div>

      {/* ── Instruction Box ── */}
      {instructionText && (
        <div
          style={{
            background: "rgba(200,241,53,0.06)",
            border: `1px solid ${LIME}33`,
            borderRadius: 16,
            padding: "14px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
          <p
            style={{
              color: "#e5e7eb",
              fontSize: 14,
              lineHeight: 1.5,
              fontWeight: 500,
              margin: 0,
            }}
          >
            {instructionText}
          </p>
          {onHint && (
            <button
              onClick={() => {
                playTapSound();
                onHint();
              }}
              style={{
                marginLeft: "auto",
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 10,
                background: `${LIME}22`,
                border: `1px solid ${LIME}55`,
                color: LIME,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Hint 🔍
            </button>
          )}
        </div>
      )}

      {/* ── Main Game Board Viewport ── */}
      <div
        style={{
          background: "rgba(10,12,10,0.92)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 24,
          padding: "28px 20px",
          minHeight: 380,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>

      {/* ── Completion Reward Modal ── */}
      <GameCompletionModal
        isOpen={isCompleted}
        result={completionResult}
        gameTitle={title}
        onPlayAgain={onPlayAgain || onRestart}
        onExit={onBack}
      />
    </div>
  );
}
