import { useState, useEffect, useRef } from "react";
import GameShell from "./GameShell";
import { OBJECT_RECOGNITION_QUESTIONS } from "../../data/gameContent";
import { useI18n } from "../../i18n/LanguageContext";
import { playTapSound, playMatchSound, playGentleMissSound } from "../../utils/gameAudio";
import { submitGameSession, getGameRecommendation } from "../../services/api";

const LIME = "#C8F135";

function getTotalRounds(lvl) {
  switch (lvl) {
    case 1: return 3; // Easy
    case 2: return 4; // Medium
    case 3: return 5; // Hard
    case 4: return 7; // Pro
    case 5: return 9; // Advance
    default: return 3;
  }
}

export default function ObjectRecognitionGame({ setPage }) {
  const { lang } = useI18n();
  const [level, setLevel] = useState(1);
  const totalRounds = getTotalRounds(level);

  const [currentRound, setCurrentRound] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedbackState, setFeedbackState] = useState(null); // null | "correct" | "wrong"
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const [showHint, setShowHint] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lastActionTimeRef = useRef(Date.now());
  const latenciesRef = useRef([]);

  // Fetch adaptive recommended level on mount
  useEffect(() => {
    getGameRecommendation("object_recognition")
      .then((res) => {
        if (res && res.recommended_level && [1, 2, 3, 4, 5].includes(res.recommended_level)) {
          setLevel(res.recommended_level);
        }
      })
      .catch(() => {});
  }, []);

  const questions = OBJECT_RECOGNITION_QUESTIONS.slice(0, totalRounds);
  const question = questions[currentRound] || questions[0];

  useEffect(() => {
    const onVoiceAnswer = event => {
      const answer = event.detail?.answer;
      if (!answer || !question?.options) return;
      const index = question.options.findIndex(option => {
        const optionText = option.text?.en || "";
        return optionText.toLowerCase() === answer || answer.includes(optionText.toLowerCase());
      });
      if (index >= 0) handleOptionSelect(question.options[index], index);
    };
    window.addEventListener("neuroaid:voice-command", onVoiceAnswer);
    return () => window.removeEventListener("neuroaid:voice-command", onVoiceAnswer);
  }, [question, feedbackState]);

  function initLevel(lvl = level) {
    setCurrentRound(0);
    setSelectedOption(null);
    setFeedbackState(null);
    setMoves(0);
    setMistakes(0);
    setTimer(0);
    setShowHint(false);
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

  function handleOptionSelect(opt, idx) {
    if (feedbackState === "correct") return;

    playTapSound();
    const now = Date.now();
    const latency = Math.min(10, Math.max(0.2, (now - lastActionTimeRef.current) / 1000));
    latenciesRef.current.push(latency);
    lastActionTimeRef.current = now;

    setSelectedOption(idx);
    setMoves((m) => m + 1);

    if (opt.correct) {
      playMatchSound();
      setFeedbackState("correct");

      setTimeout(() => {
        if (currentRound + 1 >= totalRounds) {
          handleWin(moves + 1, mistakes);
        } else {
          setCurrentRound((r) => r + 1);
          setSelectedOption(null);
          setFeedbackState(null);
          setShowHint(false);
          lastActionTimeRef.current = Date.now();
        }
      }, 1000);
    } else {
      playGentleMissSound();
      setFeedbackState("wrong");
      setMistakes((mis) => mis + 1);

      setTimeout(() => {
        setSelectedOption(null);
        setFeedbackState(null);
      }, 900);
    }
  }

  async function handleWin(finalMoves, finalMistakes) {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const totalActions = Math.max(1, finalMoves);
    const accuracy = Math.min(1.0, totalRounds / totalActions);
    const errorRate = Math.min(1.0, finalMistakes / totalActions);
    const avgResponseTime =
      latenciesRef.current.length > 0
        ? latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length
        : duration / totalActions;

    try {
      const res = await submitGameSession({
        game_id: "object_recognition",
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
        score: Math.max(50, 100 - finalMistakes * 10),
        stars: finalMistakes <= 1 ? 3 : finalMistakes <= 3 ? 2 : 1,
        duration_seconds: duration,
        feedback_message: "Great recognition of cultural and everyday items!",
        cognitive_domain: "Visual & Semantic Recognition",
        adaptive_difficulty: {
          previous_level: level,
          new_level: finalMistakes <= 1 && level < 5 ? level + 1 : level,
          reason: ["accuracy above target", "stable response time"],
          adjustment: finalMistakes <= 1 && level < 5 ? "increase" : "maintain",
        },
      });
    }
    setIsCompleted(true);
  }

  return (
    <GameShell
      gameId="object_recognition"
      title="Object Recognition"
      domainLabel="Visual & Semantic Recognition"
      accentColor="#f59e0b"
      instructionText="Look at the image below and choose the matching name from the options."
      difficultyLevel={level}
      onDifficultyChange={(lvl) => setLevel(lvl)}
      timerSeconds={timer}
      movesCount={moves}
      mistakesCount={mistakes}
      onRestart={() => initLevel(level)}
      onHint={() => setShowHint(true)}
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
      <div style={{ width: "100%", maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
        {/* Round Progress Tracker */}
        <div style={{ marginBottom: 18, color: "#9ca3af", fontSize: 13, fontWeight: 700 }}>
          Item {currentRound + 1} of {totalRounds}
        </div>

        {/* Central Object Display */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 28,
            background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, rgba(20,20,20,0.9) 80%)",
            border: "2px solid rgba(245,158,11,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 76,
            margin: "0 auto 24px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.6), 0 0 24px rgba(245,158,11,0.25)",
          }}
        >
          {question.image}
        </div>

        {/* Question Text */}
        <h3
          style={{
            fontSize: 20,
            color: "#fff",
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          {question.question[lang] || question.question.en}
        </h3>

        {/* Hint text if requested */}
        {showHint && (
          <div
            style={{
              fontSize: 14,
              color: "#fbbf24",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 12,
              padding: "8px 14px",
              marginBottom: 18,
              display: "inline-block",
            }}
          >
            💡 Hint: {question.hint[lang] || question.hint.en}
          </div>
        )}

        {/* Multiple Choice Options (Large buttons for elderly) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 16,
          }}
        >
          {question.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = isSelected && feedbackState === "correct";
            const isWrong = isSelected && feedbackState === "wrong";
            const optionText = opt.text[lang] || opt.text.en;

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(opt, idx)}
                disabled={feedbackState !== null}
                style={{
                  padding: "16px 20px",
                  borderRadius: 16,
                  border: isCorrect
                    ? "2px solid #10b981"
                    : isWrong
                    ? "2px solid #ef4444"
                    : "1px solid rgba(255,255,255,0.12)",
                  background: isCorrect
                    ? "rgba(16,185,129,0.22)"
                    : isWrong
                    ? "rgba(239,68,68,0.22)"
                    : "rgba(255,255,255,0.05)",
                  color: isCorrect ? "#10b981" : isWrong ? "#ef4444" : "#f3f4f6",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: feedbackState === null ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <span>{optionText}</span>
                {isCorrect && <span style={{ fontSize: 20 }}>✓</span>}
                {isWrong && <span style={{ fontSize: 20 }}>✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
