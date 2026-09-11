import { useState } from "react";
import { useI18n } from "../../i18n/LanguageContext";
import { detectIntent, listen, speak, playSelectSound } from "../../utils/voice";

export default function VoiceControl({ setPage }) {
  const { language, t } = useI18n();
  const [status, setStatus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customText, setCustomText] = useState("");

  const langCode = (language || "en-IN").split("-")[0].toLowerCase();

  const respond = (key, vars = {}) => {
    const text = t(key, vars);
    setStatus(text);
    speak(text, language);
  };

  const handleCommandText = (rawText) => {
    if (!rawText) return;
    setCustomText(rawText);
    playSelectSound();
    const intent = detectIntent(rawText);

    if (intent.type === "START_GAME") {
      setPage("games");
      respond("startGame", { game: t("gameHub") });
    } else if (intent.type === "REPEAT_INSTRUCTION") {
      window.dispatchEvent(new CustomEvent("neuroaid:voice-command", { detail: intent }));
      respond("repeatInstruction", { instruction: t("onscreenInstruction") });
    } else if (intent.type === "HYDRATION") {
      respond("hydration");
    } else if (intent.type === "REMINDER_ACK") {
      window.dispatchEvent(new CustomEvent("neuroaid:voice-command", { detail: intent }));
      respond("reminderDone");
    } else if (intent.type === "ROUTINE") {
      setPage("daily-care");
      respond("routine");
    } else {
      window.dispatchEvent(new CustomEvent("neuroaid:voice-command", { detail: intent }));
      const vocalText = `${rawText}. ${t("answerReceived", "Answer received.")}`;
      setStatus(vocalText);
      speak(vocalText, language);
    }
    
    setIsListening(false);
  };

  const startVoice = () => {
    setIsListening(true);
    setStatus(t("listening") || "Listening...");
    playSelectSound();

    const activeRec = listen(
      language,
      (transcript) => {
        setIsListening(false);
        handleCommandText(transcript);
      },
      () => {
        setIsListening(false);
        setShowModal(true);
        setStatus("Voice Assistant Ready");
      }
    );

    if (!activeRec) {
      setIsListening(false);
      setShowModal(true);
    }
  };

  // Localized Voice Suggestion Chips per language
  const getVoiceShortcuts = () => {
    if (langCode === "as") {
      return [
        { label: "🎮 মগজুৰ খেল আৰম্ভ কৰক", command: "start games" },
        { label: "📅 দৈনন্দিন ৰুটিন চাওক", command: "routine" },
        { label: "💧 পানী খোৱাৰ সোঁৱৰণী", command: "hydration" },
        { label: "✓ সোঁৱৰণী সম্পূৰ্ণ কৰক", command: "done" },
      ];
    }
    if (langCode === "hi") {
      return [
        { label: "🎮 मस्तिष्क खेल शुरू करें", command: "start games" },
        { label: "📅 दैनिक दिनचर्या देखें", command: "routine" },
        { label: "💧 पानी पीने का रिमाइंडर", command: "hydration" },
        { label: "✓ कार्य पूरा करें", command: "done" },
      ];
    }
    if (langCode === "bn") {
      return [
        { label: "🎮 ব্রেন গেম শুরু করুন", command: "start games" },
        { label: "📅 দৈনন্দিন রুটিন দেখুন", command: "routine" },
        { label: "💧 জল পানের রিমাইন্ডার", command: "hydration" },
        { label: "✓ কাজ সম্পন্ন করুন", command: "done" },
      ];
    }
    if (langCode === "mni") {
      return [
        { label: "🎮 লৌশিং শান্নব হৌবা", command: "start games" },
        { label: "📅 নুমিৎখুদিংগী থবক য়েংবা", command: "routine" },
        { label: "💧 ঈশিং থাকৌ", command: "hydration" },
        { label: "✓ থবক লোইশিনবা", command: "done" },
      ];
    }
    return [
      { label: "🎮 Start Brain Games", command: "start games" },
      { label: "📅 View Daily Care Routine", command: "routine" },
      { label: "💧 Drink Water Reminder", command: "hydration" },
      { label: "✓ Mark Task Done", command: "done" },
    ];
  };

  const shortcuts = getVoiceShortcuts();

  // Localized Modal Strings
  const modalTitle = langCode === "as" ? "কণ্ঠ সহায়ক (Voice Assistant)"
                   : langCode === "hi" ? "आवाज़ सहायक (Voice Assistant)"
                   : langCode === "bn" ? "ভয়েস সহকারী (Voice Assistant)"
                   : langCode === "mni" ? "খোন্থাং মনাও (Voice Assistant)"
                   : "Voice Command Assistant";

  const modalSub = langCode === "as" ? "কণ্ঠ বা বুটামৰ জৰিয়তে নিৰ্দেশ দিয়ক"
                 : langCode === "hi" ? "आवाज़ या बटन से निर्देश दें"
                 : langCode === "bn" ? "কন্ঠ বা বোতামের মাধ্যমে নির্দেশ দিন"
                 : langCode === "mni" ? "খোন্থাং নত্রগা বোতামদা চাপৌ"
                 : "Speak or tap a command below";

  const retryText = langCode === "as" ? "পুনৰ ক'বলৈ টেপ কৰক (Listen Again)"
                  : langCode === "hi" ? "पुनः बोलने के लिए टैप करें (Listen Again)"
                  : langCode === "bn" ? "আবার বলতে ট্যাপ করুন (Listen Again)"
                  : langCode === "mni" ? "অমুং হন্না ঙাংবা"
                  : "Tap to Speak into Microphone";

  const quickHeading = langCode === "as" ? "দ্ৰুত নিৰ্দেশনাসমূহ:"
                     : langCode === "hi" ? "त्वरित निर्देश:"
                     : langCode === "bn" ? "দ্রুত নির্দেশাবলী:"
                     : langCode === "mni" ? "য়াংনা তাকপা:"
                     : "Quick Voice Commands:";

  const inputPlaceholder = langCode === "as" ? "নিৰ্দেশ টাইপ কৰক..."
                         : langCode === "hi" ? "निर्देश टाइप करें..."
                         : langCode === "bn" ? "নির্দেশ টাইপ করুন..."
                         : langCode === "mni" ? "টাইপ তৌবীইউ..."
                         : "Type voice command...";

  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center", position: "relative" }}>
      {/* Voice Trigger Button */}
      <button
        onClick={startVoice}
        aria-label="Voice Assistant"
        style={{
          background: isListening
            ? "linear-gradient(135deg, #e84040, #ff5252)"
            : "linear-gradient(135deg, rgba(200,241,53,0.18), rgba(200,241,53,0.08))",
          color: isListening ? "#fff" : "#c8f135",
          border: `1px solid ${isListening ? "rgba(232,64,64,0.6)" : "rgba(200,241,53,0.35)"}`,
          borderRadius: 999,
          padding: "7px 14px",
          fontSize: 12.5,
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: isListening ? "0 0 20px rgba(232,64,64,0.5)" : "0 4px 14px rgba(0,0,0,0.3)",
          transition: "all 0.2s ease",
          animation: isListening ? "record-pulse 1.4s infinite" : "none",
        }}
      >
        <span>{isListening ? "🔴" : "🎙️"}</span>
        <span>{isListening ? (t("listening") || "Listening...") : t("voice")}</span>
      </button>

      {/* Inline Status Label */}
      {status && !showModal && (
        <span aria-live="polite" style={{ fontSize: 11.5, color: "#c8f135", fontWeight: 600 }}>
          {status}
        </span>
      )}

      {/* Voice Assistant Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(4,5,4,0.85)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: "rgba(14,16,12,0.95)",
              border: "1px solid rgba(200,241,53,0.3)",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(200,241,53,0.15)", border: "1px solid rgba(200,241,53,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  🎙️
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: "#fff" }}>
                    {modalTitle}
                  </h3>
                  <p style={{ fontSize: 11.5, color: "#888", margin: 0 }}>
                    {modalSub}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Mic Retry Button */}
            <button
              onClick={() => {
                setShowModal(false);
                startVoice();
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #c8f135, #9abf28)",
                color: "#080808",
                border: "none",
                fontWeight: 900,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 18px rgba(200,241,53,0.3)",
              }}
            >
              <span>🎙️</span> {retryText}
            </button>

            {/* Quick Action Chips */}
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              {quickHeading}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {shortcuts.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleCommandText(sc.command);
                    setShowModal(false);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(200,241,53,0.25)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    color: "#f0ece3",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c8f135")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(200,241,53,0.25)")}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {/* Text Input Fallback */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder={inputPlaceholder}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customText) {
                    handleCommandText(customText);
                    setShowModal(false);
                  }
                }}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  if (customText) {
                    handleCommandText(customText);
                    setShowModal(false);
                  }
                }}
                style={{
                  background: "#c8f135",
                  color: "#080808",
                  border: "none",
                  borderRadius: 12,
                  padding: "0 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
