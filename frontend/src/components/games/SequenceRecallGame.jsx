import { useState, useEffect, useRef } from "react";
import GameShell from "./GameShell";
import { SEQUENCE_RECALL_PALETTE } from "../../data/gameContent";
import { playTapSound, playMatchSound, playGentleMissSound } from "../../utils/gameAudio";
import { submitGameSession, getGameRecommendation } from "../../services/api";

function getSequenceParams(lvl) {
  switch (lvl) {
    case 1: return { length: 3, interval: 1100 }; // Easy
    case 2: return { length: 4, interval: 900 };  // Medium
    case 3: return { length: 5, interval: 750 };  // Hard
    case 4: return { length: 6, interval: 600 };  // Pro
    case 5: return { length: 8, interval: 450 };  // Advance
    default: return { length: 3, interval: 1100 };
  }
}

export default function SequenceRecallGame({ setPage }) {
  const [level, setLevel] = useState(1);
  const { length: targetLength, interval: flashInterval } = getSequenceParams(level);

  const [sequence, setSequence] = useState([]);
  const [activeHighlight, setActiveHighlight] = useState(null); // button id currently lit
  const [phase, setPhase] = useState("watch"); // "watch" | "input" | "success"
  const [userStep, setUserStep] = useState(0);
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const playbackTimeoutRef = useRef(null);
  const lastActionTimeRef = useRef(Date.now());
  const latenciesRef = useRef([]);

  // Fetch adaptive recommended level on mount
  useEffect(() => {
    getGameRecommendation("sequence_recall")
      .then((res) => {
        if (res && res.recommended_level && [1, 2, 3, 4, 5].includes(res.recommended_level)) {
          setLevel(res.recommended_level);
        }
      })
      .catch(() => {});
  }, []);

  // Generate random sequence of given length
  function generateSequence(len) {
    const seq = [];
    for (let i = 0; i < len; i++) {
      const randItem =
        SEQUENCE_RECALL_PALETTE[Math.floor(Math.random() * SEQUENCE_RECALL_PALETTE.length)];
      seq.push(randItem.id);
    }
    return seq;
  }

  function startRound(lvl = level) {
    const { length: len } = getSequenceParams(lvl);
    const newSeq = generateSequence(len);
    setSequence(newSeq);
    setUserStep(0);
    setPhase("watch");
    setActiveHighlight(null);
    setIsCompleted(false);
    setCompletionResult(null);
    lastActionTimeRef.current = Date.now();
    latenciesRef.current = [];

    // Playback sequence after brief delay
    setTimeout(() => {
      playSequence(newSeq, lvl);
    }, 600);
  }

  function playSequence(seq, lvl) {
    setPhase("watch");
    const { interval } = getSequenceParams(lvl);

    seq.forEach((itemId, idx) => {
      playbackTimeoutRef.current = setTimeout(() => {
        setActiveHighlight(itemId);
        playTapSound();
        setTimeout(() => setActiveHighlight(null), interval * 0.6);

        // When last item has lit up, switch to input phase
        if (idx === seq.length - 1) {
          setTimeout(() => {
            setPhase("input");
            lastActionTimeRef.current = Date.now();
          }, interval * 0.7);
        }
      }, (idx + 1) * interval);
    });
  }

  function initLevel(lvl = level) {
    if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    setMoves(0);
    setMistakes(0);
    setTimer(0);
    startTimeRef.current = Date.now();
    lastActionTimeRef.current = Date.now();
    latenciesRef.current = [];

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);

    startRound(lvl);
  }

  useEffect(() => {
    initLevel(level);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    };
  }, [level]);

  function handleButtonClick(itemId) {
    if (phase !== "input") return;

    playTapSound();
    const now = Date.now();
    const latency = Math.min(10, Math.max(0.2, (now - lastActionTimeRef.current) / 1000));
    latenciesRef.current.push(latency);
    lastActionTimeRef.current = now;

    setMoves((m) => m + 1);

    if (sequence[userStep] === itemId) {
      // Correct step
      const nextStep = userStep + 1;
      setUserStep(nextStep);

      if (nextStep >= sequence.length) {
        // Complete!
        playMatchSound();
        setPhase("success");
        handleWin(moves + 1, mistakes);
      }
    } else {
      // Mistake
      playGentleMissSound();
      setMistakes((mis) => mis + 1);
      setUserStep(0);
      setPhase("watch");
      // Replay sequence after gentle pause
      setTimeout(() => {
        playSequence(sequence, level);
      }, 1000);
    }
  }

  async function handleWin(finalMoves, finalMistakes) {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const totalActions = Math.max(1, finalMoves);
    const accuracy = Math.min(1.0, sequence.length / totalActions);
    const errorRate = Math.min(1.0, finalMistakes / totalActions);
    const avgResponseTime =
      latenciesRef.current.length > 0
        ? latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length
        : duration / totalActions;

    try {
      const res = await submitGameSession({
        game_id: "sequence_recall",
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
        feedback_message: "Wonderful working memory and attention to detail!",
        cognitive_domain: "Working Memory & Concentration",
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
      gameId="sequence_recall"
      title="Sequence Recall"
      domainLabel="Working Memory & Concentration"
      accentColor="#60a5fa"
      instructionText={
        phase === "watch"
          ? "Watch closely! Remember the order as each item lights up..."
          : `Your turn! Tap the items in the order you saw them (${userStep} / ${sequence.length} done).`
      }
      difficultyLevel={level}
      onDifficultyChange={(lvl) => setLevel(lvl)}
      timerSeconds={timer}
      movesCount={moves}
      mistakesCount={mistakes}
      onRestart={() => initLevel(level)}
      onHint={() => playSequence(sequence, level)}
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
      <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
        {/* Phase Indicator Pill */}
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 18px",
              borderRadius: 99,
              background: phase === "watch" ? "rgba(245,158,11,0.15)" : "rgba(96,165,250,0.15)",
              border: `1px solid ${phase === "watch" ? "#f59e0b" : "#60a5fa"}`,
              color: phase === "watch" ? "#f59e0b" : "#60a5fa",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {phase === "watch" ? "👀 WATCH CAREFULLY" : "👉 YOUR TURN TO TAP"}
          </span>
        </div>

        {/* 2x2 Button Grid with high contrast and large buttons (>100px) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {SEQUENCE_RECALL_PALETTE.map((btn) => {
            const isLit = activeHighlight === btn.id;

            return (
              <button
                key={btn.id}
                onClick={() => handleButtonClick(btn.id)}
                disabled={phase !== "input"}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 24,
                  border: isLit ? `4px solid #fff` : `2px solid ${btn.color}55`,
                  background: isLit
                    ? btn.color
                    : `linear-gradient(135deg, ${btn.color}22 0%, rgba(20,20,20,0.9) 100%)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: phase === "input" ? "pointer" : "default",
                  boxShadow: isLit
                    ? `0 0 36px ${btn.color}, inset 0 0 20px #fff`
                    : "0 8px 24px rgba(0,0,0,0.5)",
                  transform: isLit ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.15s ease",
                  padding: 16,
                }}
              >
                <span style={{ fontSize: 52, marginBottom: 8, filter: isLit ? "drop-shadow(0 0 10px #fff)" : "none" }}>
                  {btn.icon}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: isLit ? "#fff" : "#e5e7eb",
                    letterSpacing: 0.5,
                  }}
                >
                  {btn.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {sequence.map((_, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background:
                  i < userStep
                    ? "#10b981"
                    : i === userStep && phase === "input"
                    ? "#60a5fa"
                    : "rgba(255,255,255,0.15)",
                boxShadow: i < userStep ? "0 0 8px #10b981" : "none",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>
    </GameShell>
  );
}
