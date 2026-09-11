import { useState, useEffect, useRef } from "react";
import GameShell from "./GameShell";
import { DAILY_ROUTINE_TASKS } from "../../data/gameContent";
import { useI18n } from "../../i18n/LanguageContext";
import { playTapSound, playMatchSound, playGentleMissSound } from "../../utils/gameAudio";
import { submitGameSession, getGameRecommendation } from "../../services/api";

function getCardCount(lvl) {
  switch (lvl) {
    case 1: return 3; // Easy (3 steps)
    case 2: return 4; // Medium (4 steps)
    case 3: return 5; // Hard (5 steps)
    case 4: return 6; // Pro (6 steps)
    case 5: return 6; // Advance (6 steps speed challenge)
    default: return 3;
  }
}

export default function DailyRoutineGame({ setPage }) {
  const { lang } = useI18n();
  const [level, setLevel] = useState(1);
  const cardCount = getCardCount(level);

  const [targetTasks, setTargetTasks] = useState([]);
  const [availableCards, setAvailableCards] = useState([]);
  const [placedSlots, setPlacedSlots] = useState([]);
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lastActionTimeRef = useRef(Date.now());
  const latenciesRef = useRef([]);

  // Fetch adaptive recommended level on mount
  useEffect(() => {
    getGameRecommendation("daily_routine")
      .then((res) => {
        if (res && res.recommended_level && [1, 2, 3, 4, 5].includes(res.recommended_level)) {
          setLevel(res.recommended_level);
        }
      })
      .catch(() => {});
  }, []);

  function initLevel(lvl = level) {
    const count = getCardCount(lvl);
    const tasks = DAILY_ROUTINE_TASKS.slice(0, count);
    setTargetTasks(tasks);

    // Scramble cards for patient to order
    const scrambled = [...tasks].sort(() => Math.random() - 0.5);
    setAvailableCards(scrambled);
    setPlacedSlots(new Array(count).fill(null));

    setMoves(0);
    setMistakes(0);
    setTimer(0);
    setIsCompleted(false);
    setCompletionResult(null);
    startTimeRef.current = Date.now();
    lastActionTimeRef.current = Date.now();
    latenciesRef.current = [];

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
  }

  useEffect(() => {
    initLevel(level);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [level]);

  // When patient taps an available card, place in next empty slot
  function handleSelectCard(card) {
    playTapSound();
    const now = Date.now();
    const latency = Math.min(10, Math.max(0.2, (now - lastActionTimeRef.current) / 1000));
    latenciesRef.current.push(latency);
    lastActionTimeRef.current = now;

    const nextEmptyIndex = placedSlots.findIndex((s) => s === null);
    if (nextEmptyIndex === -1) return;

    setMoves((m) => m + 1);

    const newPlaced = [...placedSlots];
    newPlaced[nextEmptyIndex] = card;
    setPlacedSlots(newPlaced);

    setAvailableCards((prev) => prev.filter((c) => c.id !== card.id));

    // If all slots are filled, check order!
    if (nextEmptyIndex === placedSlots.length - 1) {
      checkSequence(newPlaced);
    }
  }

  // Remove card from a slot back to available list
  function handleRemoveFromSlot(index) {
    const card = placedSlots[index];
    if (!card) return;

    playTapSound();
    const now = Date.now();
    const latency = Math.min(10, Math.max(0.2, (now - lastActionTimeRef.current) / 1000));
    latenciesRef.current.push(latency);
    lastActionTimeRef.current = now;

    const newPlaced = [...placedSlots];
    newPlaced[index] = null;
    setPlacedSlots(newPlaced);

    setAvailableCards((prev) => [...prev, card]);
  }

  function checkSequence(completedSlots) {
    let isCorrect = true;
    for (let i = 0; i < completedSlots.length; i++) {
      if (completedSlots[i].order !== i + 1) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect) {
      playMatchSound();
      handleWin(moves + 1, mistakes);
    } else {
      playGentleMissSound();
      setMistakes((mis) => mis + 1);
      // Brief pause then clear incorrect slots
      setTimeout(() => {
        setAvailableCards(targetTasks.sort(() => Math.random() - 0.5));
        setPlacedSlots(new Array(targetTasks.length).fill(null));
        lastActionTimeRef.current = Date.now();
      }, 1200);
    }
  }

  async function handleWin(finalMoves, finalMistakes) {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const totalActions = Math.max(1, finalMoves);
    const accuracy = Math.min(1.0, cardCount / totalActions);
    const errorRate = Math.min(1.0, finalMistakes / totalActions);
    const avgResponseTime =
      latenciesRef.current.length > 0
        ? latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length
        : duration / totalActions;

    try {
      const res = await submitGameSession({
        game_id: "daily_routine",
        difficulty_level: level,
        duration_seconds: duration,
        moves_count: finalMoves,
        mistakes_count: finalMistakes,
        completed: true,
        accuracy: accuracy,
        response_time: avgResponseTime,
        error_rate: errorRate,
        completion_rate: 1.0,
        telemetry: {
          action_latencies: latenciesRef.current,
        },
      });
      setCompletionResult(res);
    } catch (e) {
      setCompletionResult({
        score: Math.max(50, 100 - finalMistakes * 12),
        stars: finalMistakes === 0 ? 3 : finalMistakes <= 2 ? 2 : 1,
        duration_seconds: duration,
        feedback_message: "Wonderful temporal orientation and procedural sequence memory!",
        cognitive_domain: "Daily Routine & Orientation",
        adaptive_difficulty: {
          previous_level: level,
          new_level: finalMistakes === 0 && level < 5 ? level + 1 : level,
          reason: ["accuracy above target", "stable response time"],
          adjustment: finalMistakes === 0 && level < 5 ? "increase" : "maintain",
        },
      });
    }
    setIsCompleted(true);
  }

  return (
    <GameShell
      gameId="daily_routine"
      title="Daily Routine Recall"
      domainLabel="Daily Routine & Orientation"
      accentColor="#fb923c"
      instructionText="Arrange the activities in the order you do them throughout the day, from morning to evening."
      difficultyLevel={level}
      onDifficultyChange={(lvl) => setLevel(lvl)}
      timerSeconds={timer}
      movesCount={moves}
      mistakesCount={mistakes}
      onRestart={() => initLevel(level)}
      onHint={() => {
        // Automatically place the first unplaced correct card
        const nextIdx = placedSlots.findIndex((s) => s === null);
        if (nextIdx !== -1) {
          const expectedOrder = nextIdx + 1;
          const matchingCard = availableCards.find((c) => c.order === expectedOrder);
          if (matchingCard) handleSelectCard(matchingCard);
        }
      }}
      onBack={() => setPage("games")}
      isCompleted={isCompleted}
      completionResult={completionResult}
      onPlayAgain={(nextLvl) => {
        if (nextLvl && [1, 2, 3, 4, 5].includes(nextLvl)) {
          setLevel(nextLvl);
        } else {
          initLevel(level);
        }
      }}
    >
      <div style={{ width: "100%", maxWidth: 740, margin: "0 auto" }}>
        {/* Timeline Slots Row */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 14, color: "#9ca3af", fontWeight: 700, marginBottom: 14, textAlign: "center" }}>
            Step Sequence (Morning → Night):
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cardCount}, 1fr)`,
              gap: 14,
            }}
          >
            {placedSlots.map((card, idx) => {
              const cardTitle = card ? (card.title[lang] || card.title.en) : "";

              return (
                <div
                  key={idx}
                  onClick={() => card && handleRemoveFromSlot(idx)}
                  style={{
                    aspectRatio: "1 / 1.15",
                    borderRadius: 20,
                    border: card ? "2px solid #fb923c" : "2px dashed rgba(255,255,255,0.18)",
                    background: card ? "rgba(251,146,60,0.15)" : "rgba(255,255,255,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: card ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    padding: 10,
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 10,
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#fb923c",
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {card ? (
                    <>
                      <span style={{ fontSize: 38, marginBottom: 4 }}>{card.icon}</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#fff",
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}
                      >
                        {cardTitle}
                      </span>
                      <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                        {card.timeHint}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                      Step {idx + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Cards Bank */}
        <div>
          <div style={{ fontSize: 14, color: "#9ca3af", fontWeight: 700, marginBottom: 14, textAlign: "center" }}>
            Tap the card that happens next:
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {availableCards.map((card) => {
              const cardTitle = card.title[lang] || card.title.en;

              return (
                <button
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  style={{
                    width: 130,
                    padding: "16px 12px",
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 40, marginBottom: 6 }}>{card.icon}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {cardTitle}
                  </span>
                  <span style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, marginTop: 4 }}>
                    {card.timeHint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
