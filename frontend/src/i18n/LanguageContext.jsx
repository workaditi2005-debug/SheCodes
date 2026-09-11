import { createContext, useContext, useMemo, useState } from "react";
import { messages } from "./locales";
import { speak, playSelectSound } from "../utils/voice";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("neuroaid_language") || "en-IN");

  const value = useMemo(() => ({
    language,
    lang: language,
    setLanguage: (code) => {
      localStorage.setItem("neuroaid_language", code);
      setLanguage(code);

      // Play soft audio chime sound effect
      try {
        playSelectSound();
      } catch (e) {
        // Safe audio fallback
      }

      // Announce language change in native language TTS voice
      try {
        const announceText = messages[code]?.selectedAnnounce || messages[code]?.language || code;
        speak(announceText, code);
      } catch (e) {
        // Safe voice fallback
      }
    },
    t: (key, fallbackOrVars = {}, vars = {}) => {
      const fallback = typeof fallbackOrVars === "string" ? fallbackOrVars : key;
      const actualVars = typeof fallbackOrVars === "object" ? fallbackOrVars : vars;
      const text = messages[language]?.[key] || messages["en-IN"]?.[key] || fallback;
      return text.replace(/\{(\w+)\}/g, (_, name) => actualVars[name] ?? "");
    }
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useI18n = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return { language: "en-IN", lang: "en-IN", setLanguage: () => {}, t: (k, f) => (typeof f === "string" ? f : k) };
  }
  return ctx;
};
