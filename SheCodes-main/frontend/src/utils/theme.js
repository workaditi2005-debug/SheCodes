// ── Design tokens ────────────────────────────────────────
export const T = {
  bg:  "#080808",
  bg1: "rgba(255,255,255,0.03)",
  bg2: "rgba(255,255,255,0.05)",
  bg3: "rgba(255,255,255,0.08)",
  card:       "rgba(14,16,12,0.85)",
  cardBorder: "rgba(255,255,255,0.10)",
  white:   "#FFFFFF",
  cream:   "#FFFFFF",
  creamDim:"#AAAAAA",
  creamFaint:"#666666",
  lime:    "#C8F135",
  limeDim: "#9ABF28",
  red:     "#e84040",
  redGlow: "rgba(232,64,64,0.38)",
  green:   "#4ade80",
  amber:   "#f59e0b",
  blue:    "#60a5fa",
};

export const injectStyles = () => {
  if (document.getElementById("na-styles")) return;
  const s = document.createElement("style");
  s.id = "na-styles";
  s.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700;9..40,900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes float-up   { 0%,100%{transform:translateY(0)}        50%{transform:translateY(-10px)} }
    @keyframes pulse-dot  { 0%,100%{transform:scale(1);opacity:1}   50%{transform:scale(1.5);opacity:0.6} }
    @keyframes blink      { 0%,100%{opacity:1}    50%{opacity:0.2}  }
    @keyframes record-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(200,241,53,0.4)} 70%{box-shadow:0 0 0 14px rgba(200,241,53,0)} }
    @keyframes twinkle    { 0%,100%{opacity:0.10;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.4)} }
    @keyframes glow-pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.08)} }
    @keyframes scan-line  { 0%{top:-2px} 100%{top:100%} }
    @keyframes slide-up   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ghost-drift { 0%,100%{opacity:0.028} 50%{opacity:0.052} }
    select { color-scheme: dark; }
    select option { background: #1a1a1a !important; color: #f0ece3 !important; }
  `;
  document.head.appendChild(s);
};