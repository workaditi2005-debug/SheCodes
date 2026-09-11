import { useI18n } from "../../i18n/LanguageContext";
import { messages } from "../../i18n/locales";

export default function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 14, opacity: 0.8 }} title="Select Language">🌐</span>
      <select
        aria-label="Language Selector"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          background: "rgba(10, 10, 16, 0.85)",
          color: "#f0ece3",
          border: "1px solid rgba(200, 241, 53, 0.35)",
          borderRadius: 10,
          padding: "6px 12px",
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          outline: "none",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.40)",
          transition: "all 0.2s ease",
        }}
      >
        {Object.keys(messages).map((code) => (
          <option
            key={code}
            value={code}
            style={{
              background: "#121216",
              color: code === "as-IN" ? "#C8F135" : "#f0ece3",
              padding: 8,
              fontWeight: code === "as-IN" ? "bold" : "normal",
            }}
          >
            {messages[code].language}
          </option>
        ))}
      </select>
    </div>
  );
}
