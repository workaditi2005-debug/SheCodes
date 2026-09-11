import { useState, useEffect, useRef } from "react";
import { T } from "../utils/theme";
import { DarkCard, Btn } from "./RiskDashboard";
import { useAssessment } from "../context/AssessmentContext";

function generateSequence(len) {
  const seq = [];
  for (let i = 0; i < len; i++) {
    seq.push(Math.floor(Math.random() * 9) + 1); // 1-9
  }
  return seq;
}

export default function DigitSpanTest({ setPage }) {
  const { setDigitSpanData } = useAssessment();
  const [phase, setPhase] = useState("intro"); // intro | show | input | feedback | result
  const [level, setLevel] = useState(4); // start at 4 digits
  const [sequence, setSequence] = useState([]);
  const [showIdx, setShowIdx] = useState(-1);
  const [userInput, setUserInput] = useState("");
  const [trials, setTrials] = useState([]); // {correct, length}
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [maxSpan, setMaxSpan] = useState(0);
  const inputRef = useRef(null);
  const MAX_LEVEL = 9;
  const MAX_FAILURES = 2;

  function startTrial(len) {
    const seq = generateSequence(len);
    setSequence(seq);
    setShowIdx(0);
    setUserInput("");
    setPhase("show");
  }

  useEffect(() => {
    if (phase !== "show") return;
    if (showIdx >= sequence.length) {
      setTimeout(() => {
        setPhase("input");
        setShowIdx(-1);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 600);
      return;
    }
    const t = setTimeout(() => setShowIdx(i => i + 1), 1000);
    return () => clearTimeout(t);
  }, [phase, showIdx, sequence.length]);

  function submitAnswer() {
    const correct = userInput.replace(/\s/g, "") === sequence.join("");
    const trial = { correct, length: sequence.length };
    const newTrials = [...trials, trial];
    setTrials(newTrials);

    if (correct) setMaxSpan(Math.max(maxSpan, sequence.length));

    setFeedback(correct ? "correct" : "wrong");
    setPhase("feedback");

    setTimeout(() => {
      setFeedback(null);
      // Check if we should continue
      const recent = newTrials.filter(t => t.length === sequence.length);
      const fails = recent.filter(t => !t.correct).length;
      const nextLevel = sequence.length + 1;

      if (correct && nextLevel <= MAX_LEVEL) {
        setLevel(nextLevel);
        startTrial(nextLevel);
      } else if (!correct && fails < MAX_FAILURES) {
        startTrial(sequence.length); // retry same level
      } else {
        // End test
        const finalSpan = correct ? sequence.length : sequence.length - 1;
        const payload = {
          max_forward_span: Math.max(maxSpan, correct ? sequence.length : maxSpan),
          total_trials: newTrials.length,
          accuracy: parseFloat((newTrials.filter(t => t.correct).length / newTrials.length * 100).toFixed(1)),
        };
        setDigitSpanData(payload);
        setPhase("result");
      }
    }, 1400);
  }

  function handleKey(e) {
    if (e.key === "Enter") submitAnswer();
  }

  return (
    <div>
      <button onClick={() => setPage("assessments")} style={{ background: "none", border: "none", color: T.creamFaint, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, marginBottom: 24 }}>← Back</button>
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: T.cream, letterSpacing: -1, marginBottom: 6 }}>Working Memory Test</h1>
      <p style={{ color: T.creamFaint, fontSize: 14, marginBottom: 32 }}>Remember and repeat digit sequences. Sequences get longer as you succeed.</p>

      {phase === "intro" && (
        <DarkCard style={{ padding: 40, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔢</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: T.cream, marginBottom: 14 }}>Digit Span Test</div>
          <p style={{ color: T.creamFaint, fontSize: 14, lineHeight: 1.75, maxWidth: 400, margin: "0 auto 24px" }}>
            You'll see a sequence of digits shown one at a time. After the sequence ends,
            type the digits in the <strong style={{ color: T.cream }}>same order</strong> and press Enter.
            The sequence gets longer as you progress.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 28 }}>
            {[4, 5, 6, 7, 8].map(n => (
              <div key={n} style={{ width: 36, height: 36, borderRadius: 8, background: T.bg3, border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.creamFaint, fontSize: 16, fontWeight: 700 }}>{n}</div>
            ))}
            <span style={{ fontSize: 18, color: T.creamFaint, display: "flex", alignItems: "center" }}>→</span>
            <div style={{ padding: "8px 18px", borderRadius: 8, background: T.bg3, border: `1px solid ${T.cardBorder}`, color: T.creamDim, fontSize: 14 }}>45678</div>
          </div>
          <Btn onClick={() => startTrial(4)}>Start Test →</Btn>
        </DarkCard>
      )}

      {phase === "show" && (
        <DarkCard style={{ padding: 60, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 13, color: T.creamFaint, marginBottom: 24, letterSpacing: 0.8, textTransform: "uppercase" }}>
            Memorize this sequence ({sequence.length} digits)
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", minHeight: 120 }}>
            {sequence.map((d, i) => (
              <div key={i} style={{
                width: 72, height: 90, borderRadius: 16,
                background: i < showIdx ? "rgba(255,255,255,0.04)" : i === showIdx ? T.red : T.bg3,
                border: `2px solid ${i === showIdx ? T.red : "rgba(255,255,255,0.06)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Instrument Serif',serif", fontSize: 44, color: i < showIdx ? T.creamFaint : T.cream,
                boxShadow: i === showIdx ? `0 0 30px rgba(232,64,64,0.4)` : "none",
                transition: "all 0.2s",
              }}>
                {i < showIdx ? d : i === showIdx ? d : ""}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, color: T.creamFaint, fontSize: 13 }}>
            {showIdx < sequence.length ? `Showing digit ${showIdx + 1} of ${sequence.length}` : "Get ready to type..."}
          </div>
        </DarkCard>
      )}

      {phase === "input" && (
        <DarkCard style={{ padding: 40, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 13, color: T.creamFaint, marginBottom: 20, letterSpacing: 0.8, textTransform: "uppercase" }}>
            Type the sequence you saw ({sequence.length} digits)
          </div>
          <input
            ref={inputRef}
            value={userInput}
            onChange={e => setUserInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={handleKey}
            placeholder="Type digits here..."
            maxLength={sequence.length}
            style={{
              fontSize: 36, letterSpacing: 12, textAlign: "center",
              padding: "20px 24px", borderRadius: 16, width: "100%",
              background: T.bg2, border: `2px solid ${T.cardBorder}`,
              color: T.cream, outline: "none", fontFamily: "'DM Sans',sans-serif",
              marginBottom: 24,
            }}
          />
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn onClick={submitAnswer} disabled={userInput.length === 0}>Submit Answer</Btn>
          </div>
          <div style={{ marginTop: 16, color: T.creamFaint, fontSize: 12 }}>Press Enter or click Submit</div>
        </DarkCard>
      )}

      {phase === "feedback" && (
        <DarkCard style={{ padding: 60, textAlign: "center", border: `1px solid ${feedback === "correct" ? "rgba(34,197,94,0.3)" : "rgba(232,64,64,0.3)"}` }} hover={false}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>{feedback === "correct" ? "✅" : "❌"}</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: feedback === "correct" ? T.green : T.red, marginBottom: 14 }}>
            {feedback === "correct" ? "Correct!" : "Not quite"}
          </div>
          <div style={{ color: T.creamFaint, fontSize: 14 }}>
            The sequence was: <strong style={{ color: T.cream, letterSpacing: 6, fontSize: 18, fontFamily: "'Instrument Serif',serif" }}>{sequence.join(" ")}</strong>
          </div>
        </DarkCard>
      )}

      {phase === "result" && (
        <DarkCard style={{ padding: 40, textAlign: "center" }} hover={false}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: T.cream, marginBottom: 24 }}>Test Complete</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Max Span", value: maxSpan, color: T.blue, note: "Normal: 7±2" },
              { label: "Total Trials", value: trials.length, color: T.creamDim },
              { label: "Accuracy", value: `${Math.round(trials.filter(t => t.correct).length / trials.length * 100)}%`, color: T.green },
            ].map(m => (
              <div key={m.label} style={{ background: T.bg3, borderRadius: 12, padding: 20 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, color: m.color, marginBottom: 4 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: T.creamFaint, textTransform: "uppercase", letterSpacing: 0.8 }}>{m.label}</div>
                {m.note && <div style={{ fontSize: 10, color: T.creamFaint, marginTop: 4 }}>{m.note}</div>}
              </div>
            ))}
          </div>

          <div style={{ color: T.creamFaint, fontSize: 13, lineHeight: 1.65, maxWidth: 420, margin: "0 auto 28px", padding: "14px 18px", background: T.bg3, borderRadius: 12 }}>
            Average working memory span is 7±2 digits. Digit span strongly correlates with working memory and is associated with executive function.
          </div>

          <Btn onClick={() => setPage("assessments")}>← Back to Assessments</Btn>
        </DarkCard>
      )}
    </div>
  );
}
