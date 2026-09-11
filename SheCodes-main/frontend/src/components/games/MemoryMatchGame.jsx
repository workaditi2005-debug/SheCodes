import { useState, useEffect, useRef } from "react";
import GameShell from "./GameShell";
import GameCompletionModal from "./GameCompletionModal";
import { CULTURAL_ITEMS } from "../../data/gameContent";
import { useI18n } from "../../i18n/LanguageContext";
import {
  playTapSound,
  playMatchSound,
  playGentleMissSound,
} from "../../utils/gameAudio";
import { submitGameSession, getGameRecommendation } from "../../services/api";

function buildCards(pairCount) {
  const chosen = CULTURAL_ITEMS.slice(0, pairCount);
  const deck = [];
  chosen.forEach((item) => {
    deck.push({ ...item, uid: `${item.id}_a` });
    deck.push({ ...item, uid: `${item.id}_b` });
  });
  // Shuffle
  return deck.sort(() => Math.random() - 0.5);
}

function getPairCount(lvl) {
  switch (lvl) {
    case 1: return 3;  // Easy: 6 cards (3x2 grid)
    case 2: return 4;  // Medium: 8 cards (4x2 grid)
    case 3: return 6;  // Hard: 12 cards (4x3 grid)
    case 4: return 8;  // Pro: 16 cards (4x4 grid)
    case 5: return 10; // Advance: 20 cards (5x4 grid)
    default: return 3;
  }
}

export default function MemoryMatchGame({ setPage }) {
  const { lang } = useI18n();
  const [level, setLevel] = useState(1);
  const pairCount = getPairCount(level);

  const [cards, setCards] = useState(() => buildCards(pairCount));
  const [flipped, setFlipped] = useState([]); // indices
  const [matched, setMatched] = useState([]); // uids
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lockBoardRef = useRef(false);
  const lastActionTimeRef = useRef(Date.now());
  const latenciesRef = useRef([]);

  // Fetch adaptive recommended level on mount
  useEffect(() => {
    getGameRecommendation("memory_match")
      .then((res) => {
        if (res && res.recommended_level && [1, 2, 3, 4, 5].includes(res.recommended_level)) {
          setLevel(res.recommended_level);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize or restart level
  function initLevel(lvl = level) {
    const pairs = getPairCount(lvl);
    setCards(buildCards(pairs));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setMistakes(0);
    setTimer(0);
    setIsCompleted(false);
    setCompletionResult(null);
    lockBoardRef.current = false;
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

  // Check card flip logic
  function handleCardClick(index) {
    if (lockBoardRef.current) return;
    if (flipped.includes(index)) return;
    if (matched.includes(cards[index].uid)) return;

    playTapSound();
    const now = Date.now();
    const latency = Math.min(10, Math.max(0.2, (now - lastActionTimeRef.current) / 1000));
    latenciesRef.current.push(latency);
    lastActionTimeRef.current = now;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      lockBoardRef.current = true;
      setMoves((m) => m + 1);

      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.id === secondCard.id) {
        // Matched!
        playMatchSound();
        const newMatched = [...matched, firstCard.uid, secondCard.uid];
        setMatched(newMatched);
        setFlipped([]);
        lockBoardRef.current = false;

        // Check if all matched
        if (newMatched.length === cards.length) {
          handleWin(moves + 1, mistakes);
        }
      } else {
        // Mismatch
        playGentleMissSound();
        setMistakes((mis) => mis + 1);
        setTimeout(() => {
          setFlipped([]);
          lockBoardRef.current = false;
        }, 900);
      }
    }
  }

  async function handleWin(finalMoves, finalMistakes) {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const totalActions = Math.max(1, finalMoves);
    const accuracy = Math.min(1.0, (pairCount * 2) / totalActions);
    const errorRate = Math.min(1.0, finalMistakes / totalActions);
    const avgResponseTime =
      latenciesRef.current.length > 0
        ? latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length
        : duration / totalActions;

    try {
      const res = await submitGameSession({
        game_id: "memory_match",
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
      // Fallback local calculation
      setCompletionResult({
        score: Math.max(50, 100 - finalMistakes * 8),
        stars: finalMistakes <= 2 ? 3 : finalMistakes <= 5 ? 2 : 1,
        duration_seconds: duration,
        feedback_message: "Terrific job finding all the matching cultural pairs!",
        cognitive_domain: "Visuospatial & Memory",
        adaptive_difficulty: {
          previous_level: level,
          new_level: finalMistakes <= 2 && level < 5 ? level + 1 : level,
          reason: ["accuracy above target", "stable response time"],
          adjustment: finalMistakes <= 2 && level < 5 ? "increase" : "maintain",
        },
      });
    }
    setIsCompleted(true);
  }

  function handleHint() {
    // Reveal unmatched pair for 1.2s
    const unmatchedIndices = cards
      .map((c, i) => (matched.includes(c.uid) ? null : i))
      .filter((i) => i !== null);
    if (unmatchedIndices.length < 2) return;

    const firstCard = cards[unmatchedIndices[0]];
    const partnerIdx = cards.findIndex(
      (c, i) => i !== unmatchedIndices[0] && c.id === firstCard.id
    );

    if (partnerIdx !== -1) {
      setFlipped([unmatchedIndices[0], partnerIdx]);
      setTimeout(() => setFlipped([]), 1200);
    }
  }

  const gridCols =
    level === 1
      ? "repeat(3, 1fr)"
      : level === 2
      ? "repeat(4, 1fr)"
      : level === 3
      ? "repeat(4, 1fr)"
      : level === 4
      ? "repeat(4, 1fr)"
      : "repeat(5, 1fr)";

  const maxBoardWidth =
    level === 1 ? 520 : level === 2 ? 640 : level === 3 ? 720 : level === 4 ? 760 : 840;

  return (
    <GameShell
      gameId="memory_match"
      title="Memory Match"
      domainLabel="Visuospatial & Memory"
      accentColor="#34d399"
      instructionText="Tap two cards to find matching pairs of traditional North Eastern and everyday items."
      difficultyLevel={level}
      onDifficultyChange={(lvl) => setLevel(lvl)}
      timerSeconds={timer}
      movesCount={moves}
      mistakesCount={mistakes}
      onRestart={() => initLevel(level)}
      onHint={handleHint}
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: level >= 4 ? 12 : 16,
          width: "100%",
          maxWidth: maxBoardWidth,
          margin: "0 auto",
        }}
      >
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(card.uid);
          const isCardMatched = matched.includes(card.uid);
          const cardText =
            typeof card.label === "object" ? card.label[lang] || card.label.en : card.label;

          return (
            <button
              key={card.uid}
              onClick={() => handleCardClick(idx)}
              disabled={isFlipped || lockBoardRef.current}
              style={{
                aspectRatio: "1 / 1.15",
                borderRadius: level >= 4 ? 14 : 20,
                border: isCardMatched
                  ? "2px solid #10b981"
                  : isFlipped
                  ? "2px solid rgba(255,255,255,0.4)"
                  : "2px solid rgba(255,255,255,0.12)",
                background: isCardMatched
                  ? "rgba(16,185,129,0.18)"
                  : isFlipped
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(20,24,20,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: isFlipped ? "default" : "pointer",
                transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: isFlipped ? "scale(1.02)" : "scale(1)",
                boxShadow: isCardMatched
                  ? "0 0 24px rgba(16,185,129,0.35)"
                  : "0 6px 16px rgba(0,0,0,0.4)",
                padding: level >= 4 ? 6 : 10,
              }}
            >
              {isFlipped ? (
                <>
                  <span
                    style={{
                      fontSize: level >= 5 ? 28 : level === 4 ? 32 : level === 3 ? 36 : 46,
                      marginBottom: 4,
                    }}
                  >
                    {card.icon}
                  </span>
                  <span
                    style={{
                      fontSize: level >= 4 ? 10 : level === 3 ? 11 : 12,
                      fontWeight: 700,
                      color: isCardMatched ? "#34d399" : "#e5e7eb",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {cardText}
                  </span>
                </>
              ) : (
                <div
                  style={{
                    width: level >= 4 ? 30 : 38,
                    height: level >= 4 ? 30 : 38,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9ca3af",
                    fontSize: level >= 4 ? 16 : 20,
                    fontWeight: 900,
                  }}
                >
                  ?
                </div>
              )}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
