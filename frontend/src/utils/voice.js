// Pre-warm SpeechSynthesis Voices cache
let cachedVoices = [];
function updateVoices() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;
}

// ── Web Audio Chime Sound Effect ─────────────────────────────────────
export function playSelectSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    
    // Tone 1: Warm D5 note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: Crisp A5 harmonic chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.07);
    gain2.gain.setValueAtTime(0.15, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.40);
  } catch (e) {
    // Fallback for restricted audio contexts
  }
}

// ── Robust SpeechSynthesis Vocalizer (Hindi, Assamese, Bengali, Meitei, English) ──
let speakTimer = null;

export function stopSpeaking() {
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.error("Error stopping speech:", e);
    }
  }
}

export function speak(text, language = "en-IN") {
  if (!text || typeof text !== "string") return false;
  const cleanText = text.trim();
  if (!cleanText) return false;

  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

  try {
    // If speech engine is currently active, cancel previous speech
    if (speakTimer) {
      clearTimeout(speakTimer);
      speakTimer = null;
    }
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    // 40ms timeout ensures cancel() completes cleanly without triggering blinking/stuttering
    speakTimer = setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.90; // Slightly slower pace for elder accessibility
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const langCode = (language || "en-IN").split("-")[0].toLowerCase();
        let voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();

        let matchedVoice = null;
        let effectiveLangTag = "en-IN"; // Safe default

        if (langCode === "hi") {
          // Hindi: Google हिन्दी / hi-IN
          matchedVoice = voices.find(v => v.lang.toLowerCase().includes("hi") || v.name.includes("हिन्दी") || v.name.includes("Hindi"));
          effectiveLangTag = matchedVoice ? matchedVoice.lang : "hi-IN";
        } else if (langCode === "bn" || langCode === "as") {
          // Bengali & Assamese (Assamese script shares Nagari script with Bengali for clear vocalization)
          matchedVoice = voices.find(v => v.lang.toLowerCase().includes("bn") || v.name.includes("বাংলা") || v.name.includes("Bengali"))
            || voices.find(v => v.lang.toLowerCase().includes("as"))
            || voices.find(v => v.lang.toLowerCase().includes("hi") || v.name.includes("Hindi"));
          effectiveLangTag = matchedVoice ? matchedVoice.lang : "bn-IN";
        } else if (langCode === "mni") {
          // Meitei
          matchedVoice = voices.find(v => v.lang.toLowerCase().includes("hi") || v.name.includes("Hindi"))
            || voices.find(v => v.lang.toLowerCase().includes("bn") || v.name.includes("Bengali"));
          effectiveLangTag = matchedVoice ? matchedVoice.lang : "hi-IN";
        } else {
          // English & default
          matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode))
            || voices.find(v => v.lang.toLowerCase().includes("in"))
            || voices.find(v => v.lang.toLowerCase().includes("en"))
            || voices[0];
          effectiveLangTag = matchedVoice ? matchedVoice.lang : "en-IN";
        }

        // Utterance lang matching matched voice
        utterance.lang = effectiveLangTag;
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        utterance.onerror = (e) => {
          console.warn("SpeechSynthesis utterance error:", e);
        };

        window.speechSynthesis.speak(utterance);
      } catch (innerErr) {
        console.error("Inner speak error:", innerErr);
      } finally {
        speakTimer = null;
      }
    }, 40);

    return true;
  } catch (err) {
    console.error("Outer speak error:", err);
    return false;
  }
}

// ── Multi-Stage Web Speech Recognition with Language Fallback ──────
export function listen(language, onText, onError) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    onError?.({ type: "UNSUPPORTED", message: "Browser speech recognition API is unsupported." });
    return null;
  }

  let recognition = new Recognition();
  let primaryLang = language || "en-IN";
  let fallbackLangs = ["bn-IN", "hi-IN", "en-IN", "en-US"];
  let triedLangs = [primaryLang];

  function startRecognition(langToUse) {
    try {
      recognition.lang = langToUse;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          onText?.(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn(`Speech recognition notice on ${langToUse}:`, event.error);
        
        // On language-not-supported or network issue, attempt regional language fallback
        if ((event.error === "language-not-supported" || event.error === "network") && fallbackLangs.length > 0) {
          const nextLang = fallbackLangs.shift();
          if (!triedLangs.includes(nextLang)) {
            triedLangs.push(nextLang);
            try { recognition.stop(); } catch (e) {}
            recognition = new Recognition();
            startRecognition(nextLang);
            return;
          }
        }

        if (event.error === "no-speech") {
          onError?.({ type: "NO_SPEECH", message: "No speech detected." });
        } else if (event.error === "not-allowed") {
          onError?.({ type: "NOT_ALLOWED", message: "Microphone permission denied." });
        } else {
          onError?.({ type: event.error, message: `Voice notice: ${event.error}` });
        }
      };

      recognition.start();
    } catch (err) {
      onError?.({ type: "EXCEPTION", message: err.message });
    }
  }

  startRecognition(primaryLang);
  return recognition;
}

// ── Multi-lingual Voice Intent Recognition Engine ───────────────────────
export function detectIntent(text) {
  const value = (text || "").toLowerCase();
  
  // Games & Brain Training
  if (/start|play|game|खेल|खेलক|শুরু|আৰম্ভ|শান্নব/.test(value)) {
    return { type: "START_GAME", text: value };
  }
  // Repeat instructions
  if (/repeat|again|instruction|दोहर|আকৌ|পুনৰ|তাকপা/.test(value)) {
    return { type: "REPEAT_INSTRUCTION" };
  }
  // Hydration & Water
  if (/water|hydration|drink|पानी|পানী|জল|ঈশিং/.test(value)) {
    return { type: "HYDRATION" };
  }
  // Daily routine / Reminders
  if (/routine|schedule|care|meds|medicine|दिनचर्या|ৰুটিন|যত্ন/.test(value)) {
    return { type: "ROUTINE" };
  }
  // Task completion mark
  if (/done|complete|taken|पूरा|সম্পূৰ্ণ|লোইরে/.test(value)) {
    return { type: "REMINDER_ACK" };
  }

  return { type: "OBJECT_ANSWER", answer: value };
}
