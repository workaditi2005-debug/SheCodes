import { useState, useEffect } from "react";
import { DarkCard, Btn } from "../components/RiskDashboard";
import { getGameStats } from "../services/api";
import { useI18n } from "../i18n/LanguageContext";

const LIME = "#C8F135";

const GAMES_META = [
  {
    id: "memory_match",
    page: "game-match",
    titleKey: "memoryMatchTitle",
    title: "Memory Match",
    domain: "Visuospatial & Memory",
    icon: "🃏",
    color: "#34d399",
    descKey: "matchCardsInst",
    desc: "Find and pair matching everyday and North Eastern cultural symbols.",
    benefit: "Stimulates spatial memory and visual recall.",
  },
  {
    id: "sequence_recall",
    page: "game-sequence",
    titleKey: "sequenceRecallTitle",
    title: "Sequence Recall",
    domain: "Working Memory & Concentration",
    icon: "🔢",
    color: "#60a5fa",
    descKey: "sequenceInst",
    desc: "Remember and repeat the sequence as each colorful item lights up.",
    benefit: "Enhances attention span and sequential working memory.",
  },
  {
    id: "object_recognition",
    page: "game-object",
    titleKey: "objectRecognitionTitle",
    title: "Object Recognition",
    domain: "Visual & Semantic Recognition",
    icon: "🔍",
    color: "#f59e0b",
    descKey: "objectInst",
    desc: "Recognize familiar cultural objects and traditional heritage items.",
    benefit: "Engages semantic retrieval and visual object identification.",
  },
  {
    id: "pattern_completion",
    page: "game-pattern",
    titleKey: "patternCompletionTitle",
    title: "Pattern Completion",
    domain: "Executive Function & Patterns",
    icon: "🧩",
    color: "#a78bfa",
    descKey: "patternInst",
    desc: "Look at the repeating pattern and discover the missing piece.",
    benefit: "Exercises fluid reasoning and cognitive problem-solving.",
  },
  {
    id: "daily_routine",
    page: "game-routine",
    titleKey: "dailyRoutineTitle",
    title: "Daily Routine Recall",
    domain: "Daily Routine & Orientation",
    icon: "🌅",
    color: "#fb923c",
    descKey: "routineInst",
    desc: "Order everyday activities from morning tea to night rest.",
    benefit: "Strengthens temporal orientation and procedural sequencing.",
  },
  {
    id: "rhythm_and_recall",
    page: "game-rhythm",
    titleKey: "rhythmRecallTitle",
    title: "Rhythm & Recall",
    domain: "Musical & Emotional Memory",
    icon: "🎵",
    color: "#ec4899",
    descKey: "rhythmInst",
    desc: "Nostalgic melodies, rhythmic beat tapping, and calming hum-along for evening serenity.",
    benefit: "Stimulates preserved procedural musical circuits and eases evening sundowning restlessness.",
  },
];

export default function CognitiveGamesHub({ setPage }) {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    total_games_played: 0,
    total_stars_earned: 0,
    current_streak_days: 0,
    domain_scores: {},
  });

  useEffect(() => {
    getGameStats()
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: `rgba(200,241,53,0.10)`,
            border: `1px solid ${LIME}33`,
            borderRadius: 99,
            padding: "5px 14px",
            marginBottom: 12,
            fontSize: 11,
            fontWeight: 700,
            color: LIME,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: LIME,
              display: "inline-block",
            }}
          />
          {t("gameHub", "Brain Games")} • Adaptive AI Training
        </div>

        <h1
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(28px, 4vw, 44px)",
            color: "#fff",
            letterSpacing: "-1px",
            marginBottom: 8,
          }}
        >
          {t("gameHub", "Brain Games")} <span style={{ color: LIME }}>Hub.</span>
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6, maxWidth: 680 }}>
          {t("onscreenInstruction", "Engaging, gentle brain-training games designed specifically for memory health and routine orientation.")}
        </p>
      </div>

      {/* ── Progress & Streak KPI Bar ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <DarkCard style={{ padding: "20px 24px" }} hover={false}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(251,191,36,0.15)",
                border: "1px solid rgba(251,191,36,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              ⭐
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
                {t("score", "Total Stars")}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24" }}>
                {stats.total_stars_earned || 0}
              </div>
            </div>
          </div>
        </DarkCard>

        <DarkCard style={{ padding: "20px 24px" }} hover={false}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(96,165,250,0.15)",
                border: "1px solid rgba(96,165,250,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🎮
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
                {t("level", "Sessions")}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#60a5fa" }}>
                {stats.total_games_played || 0}
              </div>
            </div>
          </div>
        </DarkCard>

        <DarkCard style={{ padding: "20px 24px" }} hover={false}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🔥
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
                {t("highScore", "Active Streak")}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#f87171" }}>
                {stats.current_streak_days || 0} <span style={{ fontSize: 16 }}>Days</span>
              </div>
            </div>
          </div>
        </DarkCard>
      </div>

      {/* ── Games List Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: 20,
        }}
      >
        {GAMES_META.map((game) => (
          <DarkCard
            key={game.id}
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
            hover={true}
          >
            <div>
              {/* Domain Pill */}
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: `${game.color}18`,
                  border: `1px solid ${game.color}44`,
                  color: game.color,
                  fontSize: 11,
                  fontWeight: 800,
                  marginBottom: 14,
                }}
              >
                {game.domain}
              </div>

              {/* Game Icon & Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: `${game.color}15`,
                    border: `1px solid ${game.color}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    flexShrink: 0,
                  }}
                >
                  {game.icon}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 800,
                      fontSize: 18,
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    {t(game.titleKey, game.title)}
                  </h3>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>5 Difficulty Levels (Easy to Advance)</span>
                </div>
              </div>

              <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
                {t(game.descKey, game.desc)}
              </p>

              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "#9ca3af",
                  marginBottom: 20,
                }}
              >
                🧠 <strong style={{ color: "#e5e7eb" }}>Benefit:</strong> {game.benefit}
              </div>
            </div>

            <Btn
              onClick={() => setPage(game.page)}
              style={{
                width: "100%",
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 800,
                background: game.color,
                color: "#080808",
                boxShadow: `0 6px 20px ${game.color}33`,
              }}
            >
              {t("playNow", "Play Game")} →
            </Btn>
          </DarkCard>
        ))}
      </div>
    </div>
  );
}

