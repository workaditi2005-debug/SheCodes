/**
 * NeuroBot — NeuroAid's Voice-Assisted Keypad & Assistive AI Chatbot
 * Floating widget available on every page.
 * Supports voice-assisted keypad numbers (1, 2, 3, 4, 5, 0), regional language text & TTS, and RAG API queries.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { submitChat } from "../services/api";
import { speak, stopSpeaking } from "../utils/voice";
import { useI18n } from "../i18n/LanguageContext";

// ── Multilingual Multilingual Voice-Assisted Keypad Guidance Data ──────────────────────────
const IVR_DATA = {
  "en-IN": {
    intro: "Welcome to NeuroAid Assistive Customer Support 📞🧠! Please select an option below or press key 1 to 5 on your keyboard:",
    options: [
      { id: "1", label: "1. How NeuroAid Works & Screening", text: "NeuroAid evaluates 5 core cognitive domains: Reaction Speed, Executive Memory (Stroop), Fine Motor Control (Tapping), Audio Fluency, and Visual Recall. Take tests regularly to monitor your baseline cognitive stability trends." },
      { id: "2", label: "2. How to Play Cognitive Brain Games", text: "To play Cognitive Games, navigate to the Brain Games tab. Games automatically adjust difficulty based on your accuracy and response times. Complete games daily to earn cognitive health streak points!" },
      { id: "3", label: "3. Daily Care, Reminders & Memory Bank", text: "Daily Care allows you to track medication times, hydrate, and maintain your personal Memory Bank. Click checkboxes to mark routines complete and save special life memories for cognitive exercises." },
      { id: "4", label: "4. Doctor & Caregiver Portal Guide", text: "Caregivers and doctors can link your profile using your unique Patient Code (e.g., NER492). This allows them to monitor cognitive risk alerts, clinical reports, and care recommendations in real-time." },
      { id: "5", label: "5. Customer Support & Regional Voice", text: "NeuroAid customer support includes regional voice synthesis in Assamese, Hindi, Bengali, Meitei, and English. Click the speaker icon or microphone button on any page to hear guidance in your local dialect." },
      { id: "0", label: "0. Main Customer Support Menu", text: "Here is the Main Customer Service Menu. Select options 1 to 5 to learn more about NeuroAid." },
    ],
  },
  "as-IN": {
    intro: "NeuroAid গ্ৰাহক সেৱালৈ স্বাগতম 📞🧠! অনুগ্রহ কৰি তলৰ এটা বিকল্প বাছনি কৰক বা কী বোৰ্ডত ১-৫ টিপক:",
    options: [
      { id: "1", label: "১. NeuroAid কেনেকৈ কাম কৰে আৰু ৫টা পৰীক্ষা", text: "NeuroAid-এ ৫টা মুখ্য মগজুৰ দিশ মূল্যায়ন কৰে: প্রতিক্রিয়া গতি, স্মৃতিশক্তি, মটৰ নিয়ন্ত্ৰণ, শব্দ প্ৰবাহ আৰু দৃষ্টি শক্তি। আপোনাৰ মানদণ্ড সঠিক ৰাখিবলৈ নিয়মীয়াকৈ পৰীক্ষা দিয়ক।" },
      { id: "2", label: "২. মগজুৰ খেল (Brain Games) কেনেকৈ খেলিব", text: "মগজুৰ খেল খেলিবলৈ Brain Games টেবত যাওক। আপোনাৰ নিখুঁততাৰ ওপৰত ভিত্তি কৰি খেলসমূহ স্বয়ংক্ৰিয়ভাৱে কঠিন বা সহজ হ'ব। দৈনিক খেল খেলি পইন্ট অৰ্জন কৰক!" },
      { id: "3", label: "৩. দৈনিক যত্ন, ৰিমাইণ্ডাৰ আৰু স্মৃতি বেংক", text: "দৈনিক যত্ন টেবত ঔষধৰ সময়সূচী, পানী খোৱাৰ ৰিমাইণ্ডাৰ আৰু ব্যক্তিগত স্মৃতি সংৰক্ষণ কৰিব পাৰিব। সম্পূৰ্ণ হ'লে টিক মাৰ্ক কৰক।" },
      { id: "4", label: "৪. ডাক্তৰ আৰু যত্ন লওঁতাৰ প'ৰ্টেল নির্দেশিকা", text: "আপোনাৰ যত্ন লওঁতা বা ডাক্তৰে আপোনাৰ একক ৰোগী ক'ড (যেনে NER492) ব্যৱহাৰ কৰি আপোনাৰ মগজুৰ স্বাস্থ্য ৰিপ'ৰ্ট পোনে পোনে পৰীক্ষা কৰিব পাৰে।" },
      { id: "5", label: "৫. গ্ৰাহক সহায় আৰু আঞ্চলিক ভাষাত মাতৰ সহায়", text: "NeuroAid-ত অসমীয়া, হিন্দী, বাংলা, মৈতৈ আৰু ইংৰাজী ভাষাত মাতৰ সহায় উপলভ্য। যিকোনো পৃষ্ঠাত স্পীকাৰ বুটামত টিপি স্থানীয় ভাষাত শুনিতে পাব।" },
      { id: "0", label: "০. মুখ্য গ্ৰাহক সেৱা মেনু", text: "এয়া মুখ্য গ্ৰাহক সেৱা মেনু। NeuroAid সম্পৰ্কে অধিক জানিবলৈ ১-৫ বিকল্প বাছনি কৰক।" },
    ],
  },
  "hi-IN": {
    intro: "न्यूरोएड ग्राहक सेवा में आपका स्वागत है 📞🧠! कृपया नीचे दिए गए विकल्प चुनें या कीबोर्ड पर 1 से 5 दबाएं:",
    options: [
      { id: "1", label: "1. NeuroAid कैसे काम करता है और 5 परीक्षण", text: "NeuroAid 5 मुख्य संज्ञानात्मक क्षेत्रों का मूल्यांकन करता है: प्रतिक्रिया गति, कार्यकारी स्मृति (स्ट्रूप), मोटर नियंत्रण, भाषण प्रवाह और दृश्य स्मृति। रुझानों पर नज़र रखने के लिए नियमित परीक्षण दें।" },
      { id: "2", label: "2. ब्रेन गेम्स (Brain Games) कैसे खेलें", text: "ब्रेन गेम खेलने के लिए Brain Games टैब पर जाएं। गेम आपकी सटीकता और गति के आधार पर कठिनाई का स्तर स्वतः समायोजित करते हैं। पॉइंट अर्जित करने के लिए प्रतिदिन खेलें!" },
      { id: "3", label: "3. दैनिक देखभाल, दवा रिमाइंडर और मेमोरी बैंक", text: "दैनिक देखभाल टैब में आप दवाओं के समय, जलयोजन और व्यक्तिगत यादों को ट्रैक कर सकते हैं। दिनचर्या को पूरा करने के लिए चेकबॉक्स पर क्लिक करें।" },
      { id: "4", label: "4. डॉक्टर और देखभालकर्ता पोर्टल गाइड", text: "डॉक्टर और देखभालकर्ता आपके विशिष्ट रोगी कोड (जैसे NER492) का उपयोग करके आपके संज्ञानात्मक स्वास्थ्य रिपोर्ट को लाइव देख सकते हैं।" },
      { id: "5", label: "5. ग्राहक सहायता और क्षेत्रीय भाषा वॉइस गाइड", text: "NeuroAid ग्राहक सहायता में हिंदी, असमिया, बंगाली, मैतेई और अंग्रेजी में वॉइस सपोर्ट शामिल है। अपनी स्थानीय भाषा में सुनने के लिए स्पीकर बटन पर क्लिक करें।" },
      { id: "0", label: "0. मुख्य ग्राहक सेवा मेनू", text: "यह मुख्य ग्राहक सेवा मेनू है। NeuroAid के बारे में जानने के लिए 1 से 5 विकल्प चुनें।" },
    ],
  },
  "bn-IN": {
    intro: "NeuroAid কাস্টমার কেয়ার সার্ভিসে স্বাগতম 📞🧠! অনুগ্রহ করে নিচের একটি বিকল্প বেছে নিন বা কিবোর্ডে ১-৫ চাপুন:",
    options: [
      { id: "1", label: "১. NeuroAid কীভাবে কাজ করে এবং ৫টি পরীক্ষা", text: "NeuroAid ৫টি প্রধান মানসিক ক্ষেত্র মূল্যায়ন করে: প্রতিক্রিয়া গতি, মেমরি, ফাইন মোটর নিয়ন্ত্রণ, কথা বলার গতি এবং ভিজ্যুয়াল রিকল। নিয়মিত পরীক্ষা দিয়ে আপনার স্কোর চেক করুন।" },
      { id: "2", label: "২. ব্রেইন গেম (Brain Games) কীভাবে খেলবেন", text: "ব্রেইন গেম খেলতে Brain Games ট্যাবে যান। গেমগুলি আপনার নির্ভুলতার ওপর ভিত্তি করে স্বয়ংক্রিয়ভাবে কঠিন বা সহজ হবে। প্রতিদিন গেম খেলুন!" },
      { id: "3", label: "৩. দৈনিক যত্ন, ওষুধ রিমাইন্ডার এবং মেমরি ব্যাংক", text: "দৈনিক যত্ন ট্যাবে আপনি ওষুধের সময়সূচী, পানি পান এবং স্মৃতি সংরক্ষণ ট্র্যাক করতে পারবেন। রুটিন সম্পন্ন হলে চেকবাক্সে ক্লিক করুন।" },
      { id: "4", label: "৪. ডাক্তার ও কেয়ারগিভার পোর্টাল গাইড", text: "আপনার কেয়ারগিভার বা ডাক্তার আপনার পেশেন্ট কোড (যেমন NER492) ব্যবহার করে সরাসরি আপনার রিপোর্ট এবং ঝুঁকি সতর্কতা দেখতে পারবেন।" },
      { id: "5", label: "৫. কাস্টমার সাপোর্ট এবং আঞ্চলিক ভাষার ভয়েস গাইড", text: "NeuroAid-এ বাংলা, অসমীয়া, হিন্দি, মৈতৈ এবং ইংরেজি ভাষায় ভয়েস সাপোর্ট রয়েছে। যেকোনো পৃষ্ঠায় স্পিকার বোতামে ক্লিক করে আঞ্চলিক ভাষায় শুনুন।" },
      { id: "0", label: "০. প্রধান কাস্টমার সার্ভিস মেনু", text: "এটি প্রধান কাস্টমার সার্ভিস মেনু। NeuroAid সম্পর্কে বিশদে জানতে ১ থেকে ৫ বিকল্প বেছে নিন।" },
    ],
  },
  "mni-IN": {
    intro: "NeuroAid কস্তমর কেয়ার সেবাসু তরাম্না ওকচরি 📞🧠! চানবীদুনা মখাগী অপশন অমা খনবীয়ু নত্রগা কিবোর্দ্দা ১-৫ নমবীয়ু:",
    options: [
      { id: "1", label: "১. NeuroAid করম্না থবক তৌবগে অমসুং ৫টি তেস্ত", text: "NeuroAid-না মকোকগী থবক ৫ মূল্যায়ন তৌই: রিয়েক্সন স্পীদ, মেমোরি, মোতর কন্ট্রোল, ৱাহৈ ফোংদোকপা অমসুং মেমোরি। চাং নাইনা তেস্ত তৌবীয়ু।" },
      { id: "2", label: "২. ব্রেন গেম (Brain Games) করম্না শানগনি", text: "ব্রেন গেম শাননবগীদমক Brain Games তেবদা চংবীয়ু। গেমশিং অসি নহাকগী স্কোরগী মতুং ইন্না অরুবা ফিবম ওন্থোক-ওনশিন তৌই।" },
      { id: "3", label: "৩. নুমিৎ খুদিংগী চেকশিন থৌরাং অমসুং মেমোরি বেংক", text: "নুমিৎ খুদিংগী যত্ন ট্যাবে হিদা রাজনৈতিক মতম, ইশিং থকপা অমসুং মেমোরি রেকর্ড তৌবীয়ু। লোইরবদি তিক তৌবীয়ু।" },
      { id: "4", label: "৪. দাাোক্তার অমসুং কেয়ারগিবর পোর্তেল গাইদ", text: "নহাকগী ডোক্তার নত্রগা কেয়ারগিবরনা নহাকগী পেশেন্ত কোদ (যেমন NER492) শিজিন্নদুনা নহাকগী হেলথ রিপোর্ট য়েংবা য়াই।" },
      { id: "5", label: "৫. কস্তমর সপোর্ত অমসুং লমদমগী লোনগী খোঞ্জেল সহায়", text: "NeuroAid-দা মৈতৈলোন, অসামিজ, হিন্দি, বেঙ্গলি অমসুং ইংলিশতা খোঞ্জেলগী সপোর্ত ফংই। স্পিকার বটনদা নমদুনা তাGroup তৌবীয়ু।" },
      { id: "0", label: "০. মরুইওবা কস্তমর কেয়ার মেনু", text: "অসি মরুইওবা কস্তমর কেয়ার মেনুনি। ১-৫ অপশন খনবীয়ু।" },
    ],
  },
};

function getIVRData(lang) {
  if (!lang) return IVR_DATA["en-IN"];
  if (lang.startsWith("as")) return IVR_DATA["as-IN"];
  if (lang.startsWith("hi")) return IVR_DATA["hi-IN"];
  if (lang.startsWith("bn")) return IVR_DATA["bn-IN"];
  if (lang.startsWith("mni")) return IVR_DATA["mni-IN"];
  return IVR_DATA["en-IN"];
}

// ── Built-in fallback answers (no backend needed) ────────────────────────────
const FALLBACKS = [
  { triggers: ["memory", "recall", "forget", "remember"], answer: "Memory scores reflect how accurately and quickly you recalled words or patterns. Take regular assessments to track trends." },
  { triggers: ["reaction", "speed", "slow", "fast", "click"], answer: "Reaction time measures how quickly your brain processes visual cues. Normal web reaction time ranges between 250-700ms." },
  { triggers: ["stroop", "executive", "color", "interference"], answer: "The Stroop test measures executive function — your brain's ability to focus and suppress automatic impulse reading." },
  { triggers: ["tap", "motor", "rhythm", "tapping"], answer: "The tapping test measures fine motor rhythm consistency. It is sensitive to neurological coordination." },
  { triggers: ["speech", "wpm", "pause", "fluency"], answer: "Speech analysis tracks words per minute and word-finding pauses during passage reading." },
  { triggers: ["alzheimer", "dementia", "diagnosis"], answer: "NeuroBot provides educational insights only. For Alzheimer's concerns, consult a licensed neurologist." },
];

function getFallback(question) {
  const q = question.toLowerCase();
  for (const f of FALLBACKS) {
    if (f.triggers.some(t => q.includes(t))) return f.answer;
  }
  return "Thank you for asking! You can also select numbers 1 to 5 from the Customer Support menu to explore all features of NeuroAid.";
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, onSelectOption, ivrData }) {
  const isBot = msg.role === "bot";
  return (
    <div style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", marginBottom: 12, gap: 8, alignItems: "flex-end" }}>
      {isBot && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #e84040, #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0,
        }}>🧠</div>
      )}
      <div style={{
        maxWidth: "85%",
        padding: "10px 14px",
        borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        background: isBot ? "#1e1e1e" : "linear-gradient(135deg, #e84040cc, #a78bfacc)",
        border: isBot ? "1px solid rgba(255,255,255,0.07)" : "none",
        color: "#f0ece3",
        fontSize: 13,
        lineHeight: 1.65,
        wordBreak: "break-word",
      }}>
        {msg.text}

        {/* Keypad Option Cards inside Bot response */}
        {msg.showIVR && ivrData && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {ivrData.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => onSelectOption(opt)}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: opt.id === "0" ? "1px dashed rgba(167,139,250,0.4)" : "1px solid rgba(232,64,64,0.3)",
                  background: opt.id === "0" ? "rgba(167,139,250,0.08)" : "rgba(232,64,64,0.08)",
                  color: "#f0ece3",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,64,64,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = opt.id === "0" ? "rgba(167,139,250,0.08)" : "rgba(232,64,64,0.08)"; }}
              >
                <span>{opt.label}</span>
                <span style={{ fontSize: 10, opacity: 0.6, marginLeft: "auto" }}>Press [{opt.id}]</span>
              </button>
            ))}
          </div>
        )}

        {msg.sources?.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 10, color: "rgba(240,236,227,0.4)" }}>
            📚 Sources: {msg.sources.join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #e84040, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🧠</div>
      <div style={{ padding: "10px 16px", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px 16px 16px 16px", display: "flex", gap: 4, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(240,236,227,0.4)", animation: "blink 1.2s ease infinite", animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Main NeuroBot Component ───────────────────────────────────────────────────
export default function NeuroBot({ user }) {
  const i18n = useI18n();
  const language = i18n?.language || "en-IN";
  const ivrData = getIVRData(language);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize IVR greeting on mount or language change
  useEffect(() => {
    setMessages([
      {
        role: "bot",
        text: ivrData.intro,
        showIVR: true,
      },
    ]);
  }, [language]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Immediately stop speech synthesis whenever chatbot window is closed or component unmounts
  useEffect(() => {
    if (!open) {
      stopSpeaking();
    }
    return () => {
      stopSpeaking();
    };
  }, [open]);

  // Handle IVR Option Selection
  const handleSelectIVROption = useCallback((option) => {
    const userMsgText = `[Press ${option.id}] ${option.label}`;
    const botResponseText = option.text;

    setMessages(prev => [
      ...prev,
      { role: "user", text: userMsgText },
      {
        role: "bot",
        text: botResponseText,
        showIVR: true, // Allow user to select another option anytime
      },
    ]);

    // Speak response out loud in local language
    speak(botResponseText, language);
  }, [language]);

  // Keyboard shortcut listener (Press 1, 2, 3, 4, 5, 0 or Escape when chatbot is open)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
        stopSpeaking();
        return;
      }

      // Don't intercept if user is actively typing in an input field (unless length <= 1)
      const isInputFocused = document.activeElement === inputRef.current;
      if (isInputFocused && inputRef.current?.value.length > 1) return;

      const key = e.key;
      if (["1", "2", "3", "4", "5", "0"].includes(key)) {
        const foundOpt = ivrData.options.find(o => o.id === key);
        if (foundOpt) {
          e.preventDefault();
          if (isInputFocused) setInput("");
          handleSelectIVROption(foundOpt);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, ivrData, handleSelectIVROption]);

  async function sendMessage(text) {
    const question = (text || input).trim();
    if (!question) return;

    // Check if user entered a plain number matching an IVR option (e.g., "1", "2", "3")
    const numMatch = question.match(/^[0-5]$/);
    if (numMatch) {
      const opt = ivrData.options.find(o => o.id === numMatch[0]);
      if (opt) {
        setInput("");
        handleSelectIVROption(opt);
        return;
      }
    }

    setInput("");
    setMessages(m => [...m, { role: "user", text: question }]);
    setLoading(true);

    try {
      const res = await submitChat(question, { user_name: user?.name });
      const ans = res.answer || getFallback(question);
      setMessages(m => [...m, {
        role: "bot",
        text: ans,
        sources: res.sources || [],
        showIVR: true,
      }]);
      speak(ans, language);
    } catch {
      // Backend unavailable — use fallback
      const fallbackAns = getFallback(question);
      setMessages(m => [...m, {
        role: "bot",
        text: fallbackAns,
        sources: [],
        showIVR: true,
      }]);
      speak(fallbackAns, language);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function toggleOpen() {
    setOpen(o => {
      if (o) stopSpeaking();
      return !o;
    });
    setHasNew(false);
  }

  return (
    <>
      {/* ── Floating Chat Window ── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 24, zIndex: 1000,
          width: 380, height: 550,
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,64,64,0.15)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "slideUp 0.2s ease",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 18px",
            background: "linear-gradient(135deg, rgba(232,64,64,0.2), rgba(167,139,250,0.15))",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #e84040, #a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
                boxShadow: "0 0 16px rgba(232,64,64,0.4)",
              }}>🧠</div>
              <div>
                <div style={{ fontWeight: 700, color: "#f0ece3", fontSize: 14 }}>NeuroBot Voice & Keypad Guide</div>
                <div style={{ fontSize: 11, color: "#4ade80", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "blink 2s ease infinite" }} />
                  Online · Regional Voice Active ({language})
                </div>
              </div>
            </div>
            <button
              onClick={toggleOpen}
              style={{ background: "none", border: "none", color: "rgba(240,236,227,0.5)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}
            >×</button>
          </div>

          {/* Quick Keypad Bar */}
          <div style={{
            padding: "6px 12px",
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontSize: 11,
            color: "rgba(240,236,227,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>⌨️ Interactive Keypad: Press <strong>1..5</strong> or <strong>0</strong></span>
            <button
              onClick={() => handleSelectIVROption(ivrData.options.find(o => o.id === "0"))}
              style={{ background: "none", border: "none", color: "#a78bfa", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
            >
              Main Menu [0]
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 14px",
            display: "flex", flexDirection: "column",
          }}>
            {messages.map((m, i) => (
              <Bubble
                key={i}
                msg={m}
                onSelectOption={handleSelectIVROption}
                ivrData={ivrData}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Disclaimer strip */}
          <div style={{
            padding: "6px 14px",
            background: "rgba(245,158,11,0.06)",
            borderTop: "1px solid rgba(245,158,11,0.1)",
            fontSize: 10, color: "rgba(240,236,227,0.4)", lineHeight: 1.4,
            flexShrink: 0,
          }}>
            ⚠️ Customer Care Assistant · Press numbers 1–5 for guidance.
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex", gap: 8, flexShrink: 0,
            background: "#0f0f0f",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type number (1-5) or your question…"
              disabled={loading}
              style={{
                flex: 1, padding: "10px 14px",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "#1a1a1a", color: "#f0ece3", fontSize: 13,
                fontFamily: "'DM Sans',sans-serif", outline: "none",
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #e84040, #a78bfa)"
                  : "rgba(255,255,255,0.06)",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                color: "#fff", fontSize: 16, display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              {loading ? "⏳" : "↑"}
            </button>
          </div>
        </div>
      )}

      {/* ── FAB Toggle Button ── */}
      <button
        onClick={toggleOpen}
        style={{
          position: "fixed", bottom: 28, right: 24, zIndex: 1001,
          width: 56, height: 56, borderRadius: "50%",
          background: open
            ? "rgba(255,255,255,0.1)"
            : "linear-gradient(135deg, #e84040, #a78bfa)",
          border: open ? "1px solid rgba(255,255,255,0.15)" : "none",
          cursor: "pointer",
          boxShadow: open ? "none" : "0 8px 32px rgba(232,64,64,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, transition: "all 0.25s",
          color: "#fff",
        }}
        title="NeuroBot — Voice-Assisted Keypad & Cognitive Guide"
      >
        {open ? "×" : "🧠"}
        {hasNew && !open && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            width: 10, height: 10, borderRadius: "50%",
            background: "#4ade80", border: "2px solid #0a0a0a",
          }} />
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </>
  );
}