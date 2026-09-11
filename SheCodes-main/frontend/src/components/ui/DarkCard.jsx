import { useState } from "react";
import { T } from "../../utils/helpers";

export default function DarkCard({ children, style = {}, hover = true, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,0.065)" : "rgba(255,255,255,0.042)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)"}`,
        borderRadius: 20, position: "relative", overflow: "hidden",
        transition: "all 0.25s ease",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 20px 60px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.12)" : "0 6px 30px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.07)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}>
      <div style={{ position:"absolute", top:0, left:"12%", right:"12%", height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)", pointerEvents:"none" }} />
      {children}
    </div>
  );
}
