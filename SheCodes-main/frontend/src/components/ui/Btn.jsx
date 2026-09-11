import { useState } from "react";
import { T } from "../../utils/helpers";

export default function Btn({ children, variant = "primary", onClick, style = {}, small = false }) {
  const [hov, setHov] = useState(false);
  const v = {
    primary: { background: hov ? "linear-gradient(135deg,rgba(255,82,82,0.95),rgba(220,40,40,0.98))" : "linear-gradient(135deg,rgba(232,64,64,0.88),rgba(200,36,36,0.95))", color: T.white, border: "1px solid rgba(232,80,80,0.40)", boxShadow: hov ? "0 8px 28px rgba(232,64,64,0.48), inset 0 1px 0 rgba(255,255,255,0.20)" : "0 4px 16px rgba(232,64,64,0.30), inset 0 1px 0 rgba(255,255,255,0.14)" },
    cream:   { background: hov ? "rgba(240,236,227,0.14)" : "rgba(240,236,227,0.08)", color: T.cream, border: "1px solid rgba(240,236,227,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)" },
    ghost:   { background: hov ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)", color: hov ? T.creamDim : T.creamFaint, border: `1px solid ${hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)"}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" },
  };
  return (
    <button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}
      style={{ padding: small ? "8px 18px" : "12px 26px", borderRadius: 50, fontWeight: 600, fontSize: small ? 13 : 14, cursor: "pointer", transition: "all 0.22s ease", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans',sans-serif", letterSpacing: 0.2, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transform: hov ? "translateY(-1px)" : "none", ...(v[variant] || v.primary), ...style }}>
      {children}
    </button>
  );
}
