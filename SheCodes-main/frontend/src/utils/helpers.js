// ── Design tokens — glass-compatible rgba values ───────────────────────────
export const T = {
  bg:  "#07070a",
  bg1: "rgba(255,255,255,0.025)",
  bg2: "rgba(255,255,255,0.045)",
  bg3: "rgba(255,255,255,0.065)",
  card:       "rgba(255,255,255,0.042)",
  cardBorder: "rgba(255,255,255,0.09)",
  cream: "#f0ece3", creamDim: "#b8b3a8", creamFaint: "#6b6760",
  red: "#e84040", redGlow: "rgba(232,64,64,0.38)", redFaint: "rgba(232,64,64,0.13)",
  green: "#4ade80", amber: "#f59e0b", blue: "#60a5fa", white: "#fff",
};

export const injectStyles = () => {
  if (document.getElementById("na-styles")) return;
  const s = document.createElement("style");
  s.id = "na-styles";
  s.innerHTML = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes float      { 0%,100%{transform:translateY(0)}        50%{transform:translateY(-10px)} }
    @keyframes floatR     { 0%,100%{transform:translateY(0) rotate(2deg)}  50%{transform:translateY(-8px) rotate(2deg)} }
    @keyframes floatL     { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-12px) rotate(-2deg)} }
    @keyframes blink      { 0%,100%{opacity:1}    50%{opacity:0.2}  }
    @keyframes record-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(232,64,64,0.5)} 70%{box-shadow:0 0 0 16px rgba(232,64,64,0)} }
    @keyframes twinkle    { 0%,100%{opacity:0.12} 50%{opacity:0.75} }
    @keyframes glow-pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.75;transform:scale(1.06)} }
  `;
  document.head.appendChild(s);
};

export const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
