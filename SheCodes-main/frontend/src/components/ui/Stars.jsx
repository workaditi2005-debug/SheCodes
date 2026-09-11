import { useRef } from "react";
import { T } from "../../utils/helpers";

export default function Stars({ count = 60 }) {
  const stars = useRef(Array.from({ length: count }, () => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    delay: Math.random() * 4, dur: Math.random() * 3 + 2,
  }))).current;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: "50%", background: T.cream, animation: `twinkle ${s.dur}s ${s.delay}s infinite` }} />
      ))}
    </div>
  );
}
