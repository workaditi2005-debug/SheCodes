import { useState, useEffect, useRef } from "react";
import LanguageSelector from "../components/common/LanguageSelector";

const C = {
  bg:      "#080808",
  lime:    "#C8F135",
  limeDim: "#9ABF28",
  white:   "#FFFFFF",
  offWhite:"#E8E8E8",
  dim:     "#555555",
};

/* ── Fixed grid ──────────────────────────────────────────── */
const GridBg = () => (
  <div style={{
    position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
    backgroundImage:`linear-gradient(rgba(255,255,255,0.038) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.038) 1px,transparent 1px)`,
    backgroundSize:"80px 80px",
  }} />
);

/* ── Nav dropdown data ──────────────────────────────────── */
const NAV_DATA = {
  Guides: [
    { title:"Getting Started", items:[
      { icon:"🚀", label:"Quick Start Guide", desc:"Set up your first assessment in 5 minutes" },
      { icon:"📖", label:"How Tests Work",    desc:"The science behind each screening" },
      { icon:"🎯", label:"Reading Results",   desc:"Interpret your cognitive score dashboard" },
    ]},
    { title:"Advanced", items:[
      { icon:"🩺", label:"Doctor Portal",     desc:"How clinicians review patient data" },
      { icon:"📊", label:"Progress Tracking", desc:"Monitor improvement over time" },
      { icon:"🔗", label:"API Docs",          desc:"Integrate NeuroAid into your platform" },
    ]},
  ],
  Support: [
    { title:"Help Center", items:[
      { icon:"💬", label:"Live Chat",     desc:"Talk to our team in real time" },
      { icon:"📧", label:"Email Support", desc:"Response within 24 hours" },
      { icon:"❓", label:"FAQ",           desc:"Most common questions answered" },
    ]},
    { title:"Resources", items:[
      { icon:"📋", label:"Release Notes",     desc:"What's new in each update" },
      { icon:"🐛", label:"Report a Bug",      desc:"Help us improve the platform" },
      { icon:"🏥", label:"Clinical Partners", desc:"For hospitals and clinics" },
    ]},
  ],
  About: [
    { title:"Company", items:[
      { icon:"🧠", label:"Our Mission",  desc:"Why we built NeuroAid" },
      { icon:"👥", label:"The Team",     desc:"Neuroscientists and engineers" },
      { icon:"📰", label:"Press & Media",desc:"Coverage and announcements" },
    ]},
    { title:"Science", items:[
      { icon:"🔬", label:"Research Papers", desc:"Peer-reviewed studies behind our tests" },
      { icon:"🏆", label:"Screening Benchmarks", desc:"Multi-domain psychometric & algorithmic screening protocols" },
      { icon:"🌐", label:"Global Reach",    desc:"How we serve patients worldwide" },
    ]},
  ],
};


/* ── Dropdown panel ─────────────────────────────────────── */
function Dropdown({ name }) {
  const sections = NAV_DATA[name];
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      position:"absolute", top:"calc(100% + 14px)", left:"50%",
      transform:"translateX(-50%)",
      background:"rgba(8,10,8,0.98)",
      backdropFilter:"blur(32px)", WebkitBackdropFilter:"blur(32px)",
      border:"1px solid rgba(255,255,255,0.10)",
      borderRadius:20,
      boxShadow:"0 32px 80px rgba(0,0,0,0.80),inset 0 1px 0 rgba(255,255,255,0.07)",
      padding:"24px 28px",
      display:"flex", gap:32,
      minWidth:520, zIndex:9999,
      animation:"dd-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      <div style={{ position:"absolute",top:0,left:"10%",right:"10%",height:1,background:`linear-gradient(90deg,transparent,${C.lime}44,transparent)` }} />
      {sections.map(sec=>(
        <div key={sec.title} style={{ flex:1 }}>
          <div style={{ fontSize:10,fontWeight:700,color:C.lime,letterSpacing:2,textTransform:"uppercase",marginBottom:14 }}>{sec.title}</div>
          {sec.items.map(it=>(
            <div key={it.label} style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"9px 12px",borderRadius:12,marginBottom:3,cursor:"pointer",transition:"background 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >
              <span style={{ fontSize:19,flexShrink:0,marginTop:1 }}>{it.icon}</span>
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:C.white,marginBottom:2 }}>{it.label}</div>
                <div style={{ fontSize:11,color:C.dim,lineHeight:1.5 }}>{it.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   NAVBAR — rendered as a React Portal so it's ALWAYS
   a direct child of <body>, completely outside any
   transform/perspective ancestor. This is the ONLY
   reliable fix for position:fixed breaking.
════════════════════════════════════════════════════════ */
import { createPortal } from "react-dom";

function NavPortal({ setView, open, setOpen, onStartSihDemo }) {
  return createPortal(
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:9000,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 40px", height:60,
      background:"rgba(8,8,8,0.92)",
      backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
      borderBottom:"1px solid rgba(255,255,255,0.07)",
      fontFamily:"'DM Sans',sans-serif",
    }}>
      {/* Logo */}
      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${C.lime},${C.limeDim})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15,color:"#080808",boxShadow:`0 0 18px ${C.lime}44` }}>N</div>
        <span style={{ fontWeight:900,fontSize:18,letterSpacing:"-0.5px",color:C.white }}>NeuroAid</span>
      </div>

      {/* Links */}
      <div style={{ display:"flex",alignItems:"center",gap:4 }}>
        {["Guides","Support","About"].map(name=>(
          <div key={name} style={{ position:"relative" }}>
            <button
              onClick={e=>{ e.stopPropagation(); setOpen(open===name?null:name); }}
              style={{
                background:"none",border:"none",
                color:open===name?C.white:C.dim,
                fontSize:14,cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif",
                padding:"8px 14px",borderRadius:8,
                transition:"color 0.2s",
                display:"flex",alignItems:"center",gap:5,
              }}
              onMouseEnter={e=>e.currentTarget.style.color="#fff"}
              onMouseLeave={e=>{ if(open!==name) e.currentTarget.style.color=C.dim; }}
            >
              {name}
              <span style={{ fontSize:8,opacity:0.55,display:"inline-block",transition:"transform 0.2s",transform:open===name?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
            </button>
            {open===name && <Dropdown name={name} />}
          </div>
        ))}
        <LanguageSelector />
        <button
          onClick={onStartSihDemo}
          style={{
            background:"linear-gradient(135deg, #c8f135, #a3e635)",
            border:"none",color:"#080808",
            fontWeight:800,fontSize:13,padding:"9px 18px",
            borderRadius:50,cursor:"pointer",marginLeft:8,
            fontFamily:"'DM Sans',sans-serif",
            boxShadow:`0 0 24px ${C.lime}55`,transition:"all 0.2s",
            display:"flex",alignItems:"center",gap:6,
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="#d4ff40";e.currentTarget.style.boxShadow=`0 0 36px ${C.lime}88`;}}
          onMouseLeave={e=>{e.currentTarget.style.background="#c8f135";e.currentTarget.style.boxShadow=`0 0 24px ${C.lime}55`;}}
        >
          <span>⚡</span> Start SIH Demo (4 Min)
        </button>
        <button onClick={()=>setView("login")} style={{
          background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"#fff",
          fontWeight:600,fontSize:13,padding:"8px 16px",
          borderRadius:50,cursor:"pointer",marginLeft:4,
          fontFamily:"'DM Sans',sans-serif",
        }}>Sign In</button>
      </div>
    </nav>,
    document.body
  );
}


/* ── App cards ───────────────────────────────────────────── */
const APP_CARDS = [
  { id:"speech",   label:"Speech AI",  bg:"linear-gradient(145deg,#c0392b,#8e1a13)", emoji:"🎙️", tilt:-8,  tx:-14, ty:10  },
  { id:"memory",   label:"MemoryTest", bg:"linear-gradient(145deg,#2c5fbc,#1a3a8a)", emoji:"🧠", tilt: 4,  tx:  0, ty:-5  },
  { id:"reaction", label:"ReactionX",  bg:"linear-gradient(145deg,#1e7a5a,#0f5040)", emoji:"⚡", tilt: 10, tx: 14, ty: 8  },
  { id:"progress", label:"Progress",   bg:"linear-gradient(145deg,#3d8b3d,#245c24)", emoji:"📈", tilt:-6,  tx:-11, ty:-8  },
  { id:"stroop",   label:"DocPortal",  bg:"linear-gradient(145deg,#6b35c8,#42198a)", emoji:"🩺", tilt: 2,  tx:  0, ty: 5  },
  { id:"results",  label:"Reports",    bg:"linear-gradient(145deg,#1a7a82,#0f4d52)", emoji:"📋", tilt: 8,  tx: 11, ty:-6  },
];

/* AppCard uses its own transform — NO perspective on any ancestor needed */
function AppCard({ card, mx, my, onClick }) {
  const [hov,setHov]=useState(false);
  const px   = (mx-0.5)*card.tx*1.3;
  const py   = (my-0.5)*card.ty*1.3;
  /* rotateX/Y need perspective but ONLY on this element's own context */
  const tf = hov
    ? `scale(1.08) translateY(-6px) rotate(0deg)`
    : `rotate(${card.tilt}deg) translate(${px}px,${py}px)`;
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      width:160,height:160,background:card.bg,borderRadius:32,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,
      cursor:"pointer",position:"relative",overflow:"hidden",
      transform:tf,
      transition:hov
        ? "transform 0.18s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s"
        : "transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.4s",
      boxShadow:hov
        ? "0 32px 72px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.15)"
        : "0 16px 48px rgba(0,0,0,0.60),0 0 0 1px rgba(255,255,255,0.08)",
      willChange:"transform",
    }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 100%)",borderRadius:"32px 32px 0 0",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"40%",background:"linear-gradient(0deg,rgba(0,0,0,0.30) 0%,transparent 100%)",pointerEvents:"none" }} />
      <div style={{ fontSize:42,filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.5))",zIndex:2 }}>{card.emoji}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"rgba(255,255,255,0.92)",letterSpacing:0.3,zIndex:2,textShadow:"0 2px 8px rgba(0,0,0,0.6)" }}>{card.label}</div>
    </div>
  );
}

/* ── Counter ─────────────────────────────────────────────── */
function Counter({ to, suffix="" }) {
  const [val,setVal]=useState(0);
  const ref=useRef(null);
  const fired=useRef(false);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting&&!fired.current){
        fired.current=true;
        let s=0; const step=Math.ceil(to/40);
        const t=setInterval(()=>{ s=Math.min(s+step,to); setVal(s); if(s>=to) clearInterval(t); },30);
      }
    });
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── FloatBtn ────────────────────────────────────────────── */
function FloatBtn({ children, lime, onClick }) {
  const [hov,setHov]=useState(false);
  return (
    <button onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick} style={{
      background:lime?(hov?"#d4ff40":C.lime):(hov?"rgba(255,255,255,0.10)":"rgba(255,255,255,0.06)"),
      border:lime?"none":"1px solid rgba(255,255,255,0.15)",
      color:lime?"#080808":C.offWhite,
      fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,
      padding:"13px 28px",borderRadius:50,cursor:"pointer",
      boxShadow:lime?`0 0 ${hov?"40px":"22px"} ${C.lime}${hov?"70":"44"}`:"none",
      transition:"all 0.22s ease",
      transform:hov?"translateY(-2px)":"none",
    }}>{children}</button>
  );
}

/* ── GlowCard ────────────────────────────────────────────── */
function GlowCard({ children, style={}, glowAlpha="22" }) {
  return (
    <div style={{
      background:"rgba(10,12,10,0.90)",
      border:"1px solid rgba(255,255,255,0.09)",
      borderRadius:24,
      backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
      boxShadow:`0 24px 80px rgba(0,0,0,0.60),0 0 60px ${C.lime}10,inset 0 1px 0 rgba(255,255,255,0.07)`,
      overflow:"hidden",position:"relative",
      ...style,
    }}>
      <div style={{ position:"absolute",top:0,left:"8%",right:"8%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:0,right:0,width:"65%",height:"60%",background:`radial-gradient(ellipse 80% 80% at 90% 110%,${C.lime}${glowAlpha} 0%,transparent 70%)`,pointerEvents:"none" }} />
      {children}
    </div>
  );
}

/* ── Service mini-card ───────────────────────────────────── */
function SvcCard({ icon, title, desc, accent }) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:hov?`${accent}10`:"rgba(14,16,12,0.80)",
      border:`1px solid ${hov?accent:"rgba(255,255,255,0.08)"}`,
      borderRadius:16,padding:"20px 22px",
      backdropFilter:"blur(14px)",
      transition:"all 0.26s ease",
      transform:hov?"translateY(-3px)":"none",
      boxShadow:hov?`0 16px 48px rgba(0,0,0,0.45),0 0 28px ${accent}18`:"0 4px 20px rgba(0,0,0,0.25)",
      cursor:"pointer",position:"relative",overflow:"hidden",
    }}>
      <div style={{ position:"absolute",bottom:0,right:0,width:"55%",height:"50%",background:`radial-gradient(ellipse 80% 80% at 100% 100%,${accent}18 0%,transparent 70%)`,pointerEvents:"none" }} />
      <div style={{ fontSize:28,marginBottom:10 }}>{icon}</div>
      <div style={{ fontWeight:900,fontSize:14,color:C.white,marginBottom:5,letterSpacing:"-0.2px" }}>{title}</div>
      <div style={{ fontSize:12,color:C.dim,lineHeight:1.6 }}>{desc}</div>
      {hov&&<div style={{ position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${accent},transparent)` }} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function LandingPage({ setView, onStartSihDemo }) {
  const [mouse,setMouse]           = useState({x:0.5,y:0.5});
  const [showMore,setShowMore]     = useState(false);
  const [mounted,setMounted]       = useState(false);
  const [showDemo,setShowDemo]     = useState(false);
  const [navOpen,setNavOpen]       = useState(null);
  const moreRef = useRef(null);

  // Smoothed mouse for parallax
  const smooth = useRef({x:0.5,y:0.5});
  const rafId  = useRef(null);

  useEffect(()=>{
    setTimeout(()=>setMounted(true),80);

    const s=document.createElement("style");
    s.id="lp-styles";
    s.innerHTML=`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&display=swap');
      @keyframes pulse-dot   {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.6}}
      @keyframes float-up    {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes ghost-drift {0%,100%{opacity:.028}50%{opacity:.055}}
      @keyframes card-in     {from{opacity:0;transform:translateY(40px) scale(.92)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes more-in     {from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
      @keyframes dd-in       {from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      html,body{scroll-behavior:smooth}
      *{box-sizing:border-box}
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-track{background:#080808}
      ::-webkit-scrollbar-thumb{background:rgba(200,241,53,0.28);border-radius:2px}
    `;
    if(!document.getElementById("lp-styles")) document.head.appendChild(s);

    // Close nav dropdown on outside click
    const closeNav=()=>setNavOpen(null);
    document.addEventListener("click",closeNav);

    return ()=>{
      const el=document.getElementById("lp-styles"); if(el) el.remove();
      document.removeEventListener("click",closeNav);
      if(rafId.current) cancelAnimationFrame(rafId.current);
    };
  },[]);

  // Smooth lerp mouse
  const [smoothMouse,setSmoothMouse]=useState({x:0.5,y:0.5});
  useEffect(()=>{
    function loop(){
      smooth.current.x += (mouse.x - smooth.current.x)*0.07;
      smooth.current.y += (mouse.y - smooth.current.y)*0.07;
      setSmoothMouse({x:smooth.current.x, y:smooth.current.y});
      rafId.current=requestAnimationFrame(loop);
    }
    rafId.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(rafId.current);
  },[mouse]);

  const handleMouseMove = e => setMouse({x:e.clientX/window.innerWidth,y:e.clientY/window.innerHeight});

  const handleMore = ()=>{
    setShowMore(true);
    setTimeout(()=>moreRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),80);
  };
  const handleClose = ()=>{
    setShowMore(false);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  return (
    /*
      ROOT DIV: absolutely no transform, no perspective, no will-change.
      This is critical — ANY CSS transform on an ancestor breaks position:fixed.
      The navbar is rendered via createPortal directly onto document.body,
      completely bypassing this tree.
    */
    <div
      onMouseMove={handleMouseMove}
      style={{ background:C.bg,color:C.white,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",overflowX:"hidden" }}
    >
      <GridBg />

      {/* Navbar via Portal — always fixed to viewport, nothing can break it */}
      <NavPortal setView={setView} open={navOpen} setOpen={setNavOpen} onStartSihDemo={onStartSihDemo} />


      {/* Demo Video Modal */}
      {showDemo && (
        <div
          onClick={() => setShowDemo(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 860,
              borderRadius: 20, overflow: "hidden",
              border: "1px solid rgba(200,241,53,0.2)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.9)",
              background: "#080808",
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.lime, animation: "pulse-dot 2s infinite" }} />
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: C.lime, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>NeuroAid Demo</span>
              </div>
              <button
                onClick={() => setShowDemo(false)}
                style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
            {/* Video — centered */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#000", aspectRatio: "16/9" }}>
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="NeuroAid Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ display: "block", width: "100%", aspectRatio: "16/9" }}
              />
            </div>
            <div style={{ padding: "14px 22px", textAlign: "center" }}>
              <p style={{ color: "#555", fontSize: 12 }}>Replace the YouTube URL in the source code with your actual demo video ID.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{
        minHeight:"100vh",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        paddingTop:80,paddingBottom:40,
        position:"relative",overflow:"hidden",
      }}>
        {/* Ghost text */}
        <div style={{
          position:"absolute",fontWeight:900,
          fontSize:"clamp(80px,14vw,200px)",color:"rgba(255,255,255,0.028)",
          letterSpacing:"-6px",userSelect:"none",pointerEvents:"none",
          top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          animation:"ghost-drift 8s ease-in-out infinite",whiteSpace:"nowrap",
          fontFamily:"'DM Sans',sans-serif",zIndex:0,
        }}>NEUROAID</div>

        {/* Ambient orbs */}
        <div style={{ position:"absolute",top:"10%",left:"15%",width:400,height:400,borderRadius:"50%",background:`radial-gradient(circle,${C.lime}07 0%,transparent 70%)`,pointerEvents:"none",animation:"float-up 10s ease-in-out infinite" }} />
        <div style={{ position:"absolute",bottom:"10%",right:"10%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(100,80,255,0.06) 0%,transparent 70%)",pointerEvents:"none",animation:"float-up 8s ease-in-out infinite 2s" }} />

        {/* ── HEADLINE ── */}
        <div style={{
          opacity:mounted?1:0,transform:mounted?"none":"translateY(20px)",
          transition:"all 0.8s ease 0.05s",
          zIndex:2,position:"relative",
          textAlign:"center",marginBottom:12,
        }}>
          {/* Eyebrow pill */}
          <div style={{
            display:"inline-flex",alignItems:"center",gap:8,
            background:"rgba(200,241,53,0.10)",border:`1px solid ${C.lime}33`,
            borderRadius:99,padding:"6px 16px",marginBottom:20,
            fontSize:11,fontWeight:700,color:C.lime,letterSpacing:1.5,textTransform:"uppercase",
          }}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:C.lime,display:"inline-block",animation:"pulse-dot 2s infinite" }} />
            Cognitive AI Platform
          </div>
          {/* Big hero headline */}
          <h1 style={{
            fontFamily:"'DM Sans',sans-serif",fontWeight:900,
            fontSize:"clamp(32px,4.5vw,66px)",lineHeight:1.05,
            letterSpacing:"-2.5px",color:C.white,margin:"0 0 14px",
          }}>
            Experience cognitive health<br/>
            like never before<br/>
            <span style={{ color:C.lime }}>with NeuroAid.</span>
          </h1>
          {/* Sub */}
          <p style={{
            color:C.dim,fontSize:16,lineHeight:1.65,
            maxWidth:480,margin:"0 auto 32px",
          }}>
            Access all 6 cognitive screening tools, all in one secure place.
          </p>
          {/* CTA row */}
          <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:44 }}>
            <button onClick={onStartSihDemo} style={{
              background:"linear-gradient(135deg, #c8f135, #bef264)",border:"none",color:"#080808",
              fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:15,
              padding:"13px 28px",borderRadius:50,cursor:"pointer",
              boxShadow:`0 0 28px ${C.lime}77`,transition:"all 0.22s",
              display:"flex",alignItems:"center",gap:8,
            }}
              onMouseEnter={e=>{e.currentTarget.style.background="#d4ff40";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.lime;e.currentTarget.style.transform="none";}}
            >
              <span>⚡</span> Start SIH Demo (4 Min)
            </button>
            <button onClick={()=>setView("login")} style={{
              background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.18)",color:"#fff",
              fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,
              padding:"13px 24px",borderRadius:50,cursor:"pointer",
              transition:"all 0.22s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.14)";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.transform="none";}}
            >Sign In / Register →</button>
            <button style={{
              background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",
              color:C.offWhite,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,
              padding:"13px 24px",borderRadius:50,cursor:"pointer",
              backdropFilter:"blur(12px)",transition:"all 0.22s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.10)";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.transform="none";}}
              onClick={()=>setShowDemo(true)}
            >Watch Video ▶</button>
          </div>

        </div>

        {/* ── APP CARD GRID ── */}
        <div style={{
          display:"grid",gridTemplateColumns:"repeat(3,160px)",gap:18,
          opacity:mounted?1:0,transition:"opacity 0.5s ease 0.3s",
          position:"relative",zIndex:2,
        }}>
          {APP_CARDS.map((card,i)=>(
            <div key={card.id} style={{ animation:mounted?`card-in 0.7s cubic-bezier(.34,1.56,.64,1) ${0.2+i*0.08}s both`:"none" }}>
              <AppCard card={card} mx={smoothMouse.x} my={smoothMouse.y} onClick={()=>setView("login")} />
            </div>
          ))}
        </div>

        {/* More / hint */}
        <div style={{
          marginTop:36,position:"relative",zIndex:2,
          opacity:mounted?1:0,transform:mounted?"none":"translateY(12px)",
          transition:"all 0.7s ease 0.55s",
        }}>
          {!showMore ? (
            <button onClick={handleMore} style={{
              background:"rgba(18,20,16,0.88)",
              border:"1px solid rgba(255,255,255,0.14)",
              color:C.offWhite,
              fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,
              padding:"12px 32px",borderRadius:50,cursor:"pointer",
              backdropFilter:"blur(20px)",
              display:"flex",alignItems:"center",gap:10,
              boxShadow:"0 8px 36px rgba(0,0,0,0.5)",
              transition:"all 0.22s ease",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${C.lime}55`;e.currentTarget.style.color=C.white;e.currentTarget.style.boxShadow=`0 8px 48px rgba(0,0,0,0.6),0 0 28px ${C.lime}14`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.14)";e.currentTarget.style.color=C.offWhite;e.currentTarget.style.boxShadow="0 8px 36px rgba(0,0,0,0.5)";}}
            >
              <span style={{ fontSize:15 }}>↓</span> More
            </button>
          ) : (
            <div style={{ display:"flex",alignItems:"center",gap:8,color:"#444",fontSize:13 }}>
              <span style={{ width:40,height:1,background:`linear-gradient(90deg,transparent,${C.lime}44)`,display:"inline-block" }} />
              Scroll down to explore
              <span style={{ width:40,height:1,background:`linear-gradient(90deg,${C.lime}44,transparent)`,display:"inline-block" }} />
            </div>
          )}
        </div>
      </section>

      {/* ══ MORE CONTENT ══ */}
      {showMore && (
        <div ref={moreRef} style={{ animation:"more-in 0.55s cubic-bezier(.34,1.2,.64,1) both" }}>

          {/* ── STATS BAR ── */}
          <section style={{ borderTop:`1px solid rgba(255,255,255,0.07)`,borderBottom:`1px solid rgba(255,255,255,0.07)`,padding:"52px 60px",position:"relative" }}>
            <div style={{ position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${C.lime}44,transparent)` }} />
            <div style={{ maxWidth:1000,margin:"0 auto",display:"flex",justifyContent:"space-around",gap:24,flexWrap:"wrap" }}>
              {[
                {val:500,suffix:"+",label:"Patients Screened"},
                {val:98, suffix:"%",label:"Accuracy Rate"},
                {val:8,  suffix:" min",label:"Avg Assessment Time"},
                {val:6,  suffix:"",label:"Cognitive Tests"},
              ].map(s=>(
                <div key={s.label} style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:900,fontSize:52,color:C.lime,lineHeight:1,letterSpacing:"-2px" }}>
                    <Counter to={s.val} suffix={s.suffix} />
                  </div>
                  <div style={{ fontSize:12,color:C.dim,marginTop:8,fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── HERO TEXT + FLOATING STAT CARDS ── */}
          <section style={{ padding:"80px 60px" }}>
            <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",gap:60,alignItems:"center",flexWrap:"wrap" }}>
              <div style={{ flex:1,minWidth:280 }}>
                <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:`rgba(200,241,53,0.10)`,border:`1px solid ${C.lime}33`,borderRadius:99,padding:"5px 14px",marginBottom:20,fontSize:11,fontWeight:700,color:C.lime,letterSpacing:1.5,textTransform:"uppercase" }}>
                  <span style={{ width:5,height:5,borderRadius:"50%",background:C.lime,display:"inline-block",animation:"pulse-dot 2s infinite" }} />
                  Cognitive AI Platform
                </div>
                <h2 style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:"clamp(36px,5vw,68px)",lineHeight:1.06,letterSpacing:"-2.5px",color:C.white,margin:"0 0 20px" }}>
                  We help you<br/>
                  <span style={{ color:C.lime }}>understand</span> &<br/>
                  protect your brain.
                </h2>
                <p style={{ color:C.dim,fontSize:16,lineHeight:1.7,maxWidth:460,marginBottom:32 }}>
                  AI-powered cognitive screening for speech, memory, and reaction — all in one platform.
                </p>
                <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
                  <FloatBtn lime onClick={()=>setView("login")}>Start Free Assessment →</FloatBtn>
                  <FloatBtn onClick={()=>setShowDemo(true)}>Watch Demo ▶</FloatBtn>
                </div>
              </div>
              {/* Floating stat cards */}
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {[
                  {label:"Cognitive Score",val:"74",    sub:"Low Risk",color:C.lime,   anim:"float-up 6s ease-in-out infinite"},
                  {label:"Speech Rate",   val:"142 wpm",sub:"Normal",  color:"#60a5fa",anim:"float-up 8s ease-in-out infinite 1s"},
                  {label:"Reaction Time", val:"284ms",  sub:"On trend",color:"#f59e0b",anim:"float-up 7s ease-in-out infinite 0.5s"},
                ].map(s=>(
                  <div key={s.label} style={{
                    background:"rgba(12,14,10,0.92)",border:"1px solid rgba(255,255,255,0.10)",
                    borderRadius:16,padding:"14px 18px",
                    backdropFilter:"blur(24px)",
                    boxShadow:"0 20px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08)",
                    animation:s.anim,minWidth:175,position:"relative",overflow:"hidden",
                  }}>
                    <div style={{ position:"absolute",top:0,left:"10%",right:"10%",height:1,background:`linear-gradient(90deg,transparent,${s.color}44,transparent)` }} />
                    <div style={{ position:"absolute",bottom:0,right:0,width:"50%",height:"50%",background:`radial-gradient(ellipse 80% 80% at 100% 100%,${s.color}18 0%,transparent 70%)`,pointerEvents:"none" }} />
                    <div style={{ fontSize:10,color:C.dim,marginBottom:4,fontWeight:600,letterSpacing:1,textTransform:"uppercase" }}>{s.label}</div>
                    <div style={{ fontWeight:900,fontSize:22,color:C.white,letterSpacing:"-0.5px" }}>{s.val}</div>
                    <div style={{ fontSize:10,color:s.color,marginTop:3,display:"flex",alignItems:"center",gap:4 }}>
                      <span style={{ width:5,height:5,borderRadius:"50%",background:s.color,display:"inline-block",animation:"pulse-dot 2s infinite" }} />
                      {s.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ CARD 1 — EXPERIENCE COGNITIVE HEALTH / CTA ════ */}
          <section style={{ padding:"0 60px 48px" }}>
            <div style={{ maxWidth:1100,margin:"0 auto" }}>
              <GlowCard style={{ padding:"64px 56px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:48,flexWrap:"wrap" }} glowAlpha="30">
                <div style={{ position:"relative",zIndex:2,maxWidth:520 }}>
                  <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:`rgba(200,241,53,0.10)`,border:`1px solid ${C.lime}33`,borderRadius:99,padding:"5px 14px",marginBottom:20,fontSize:11,fontWeight:700,color:C.lime,letterSpacing:1.5,textTransform:"uppercase" }}>
                    <span style={{ width:5,height:5,borderRadius:"50%",background:C.lime,display:"inline-block",animation:"pulse-dot 2s infinite" }} />
                    Why NeuroAid
                  </div>
                  <h2 style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:"clamp(26px,3.2vw,50px)",letterSpacing:"-1.5px",lineHeight:1.08,color:C.white,marginBottom:16 }}>
                    Experience cognitive health<br/>
                    like never before<br/>
                    <span style={{ color:C.lime }}>with NeuroAid.</span>
                  </h2>
                  <p style={{ color:C.dim,fontSize:15,lineHeight:1.75,maxWidth:420 }}>
                    AI-powered screening that's fast, accurate, and doctor-verified — all from your browser. No appointments, no waiting rooms.
                  </p>
                  {/* Feature pills */}
                  <div style={{ display:"flex",gap:10,marginTop:24,flexWrap:"wrap" }}>
                    {["✓ 98% Accurate","✓ 8 min avg","✓ Doctor Verified","✓ HIPAA Safe"].map(f=>(
                      <div key={f} style={{ background:"rgba(200,241,53,0.08)",border:`1px solid ${C.lime}22`,borderRadius:99,padding:"5px 14px",fontSize:12,fontWeight:600,color:C.lime }}>{f}</div>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:14,alignItems:"flex-start",position:"relative",zIndex:2 }}>
                  <FloatBtn lime onClick={()=>setView("login")}>⬡ Start Free Assessment</FloatBtn>
                  <FloatBtn>Learn More →</FloatBtn>
                  <div style={{ display:"flex",gap:10,marginTop:6 }}>
                    {["🌐","📱","💻"].map(e=>(
                      <div key={e} style={{ width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>{e}</div>
                    ))}
                  </div>
                  <div style={{ color:C.dim,fontSize:12 }}>Available on web, iOS & Android</div>
                </div>
              </GlowCard>
            </div>
          </section>

          {/* ═══ CARD 2 — 6 COGNITIVE TESTS ════════════════════ */}
          <section style={{ padding:"0 60px 60px" }}>
            <div style={{ maxWidth:1100,margin:"0 auto" }}>
              <GlowCard style={{ padding:"48px 52px" }}>
                <div style={{ position:"relative",zIndex:2 }}>
                  <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:36,flexWrap:"wrap",gap:16 }}>
                    <div>
                      <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:`rgba(200,241,53,0.10)`,border:`1px solid ${C.lime}33`,borderRadius:99,padding:"5px 14px",marginBottom:14,fontSize:11,fontWeight:700,color:C.lime,letterSpacing:1.5,textTransform:"uppercase" }}>
                        Our Services
                      </div>
                      <h2 style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:"clamp(24px,2.8vw,42px)",letterSpacing:"-1.5px",color:C.white,lineHeight:1.1,margin:0 }}>
                        6 cognitive tests.<br/>
                        <span style={{ color:C.dim,fontWeight:400,fontSize:"0.75em" }}>One complete picture.</span>
                      </h2>
                    </div>
                    <FloatBtn lime onClick={()=>setView("login")}>Start Assessment →</FloatBtn>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14 }}>
                    {[
                      { icon:"🎙️",title:"Speech Analysis",  desc:"WPM, pauses & rhythm — vocal biomarkers of cognitive decline.",  accent:C.lime    },
                      { icon:"🧠",title:"Memory Test",       desc:"Recall + delayed recall. Latency, order & intrusion errors.",     accent:"#60a5fa" },
                      { icon:"⚡",title:"Reaction Time",     desc:"Attention via response drift, misses & speed across 30 targets.", accent:"#f59e0b" },
                      { icon:"🎨",title:"Stroop Test",       desc:"Color-word interference — gold-standard executive function.",     accent:"#a78bfa" },
                      { icon:"🥁",title:"Motor Tap",         desc:"10-second tapping measures rhythmic motor control.",               accent:"#fb923c" },
                      { icon:"📊",title:"Risk Dashboard",    desc:"Unified Alzheimer's, Dementia & Parkinson's risk scores.",        accent:"#4ade80" },
                    ].map(s=><SvcCard key={s.title} {...s} />)}
                  </div>
                </div>
              </GlowCard>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer style={{
            borderTop:`1px solid rgba(255,255,255,0.07)`,
            padding:"36px 60px",
            display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,flexWrap:"wrap",
          }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.lime},${C.limeDim})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#080808" }}>N</div>
              <span style={{ fontWeight:900,fontSize:17,letterSpacing:"-0.5px" }}>NeuroAid</span>
            </div>

            <button onClick={handleClose} style={{
              background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.14)",
              color:C.offWhite,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
              padding:"10px 24px",borderRadius:50,cursor:"pointer",
              display:"flex",alignItems:"center",gap:8,
              backdropFilter:"blur(12px)",transition:"all 0.22s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${C.lime}55`;e.currentTarget.style.color=C.white;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.14)";e.currentTarget.style.color=C.offWhite;}}
            >↑ Close</button>

            <div style={{ display:"flex",alignItems:"center",gap:20 }}>
              <div style={{ display:"flex",gap:4 }}>
                {["Privacy","Terms","Contact"].map(l=>(
                  <button key={l} style={{ background:"none",border:"none",color:C.dim,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:"4px 10px",transition:"color 0.2s" }}
                    onMouseEnter={e=>e.target.style.color=C.lime}
                    onMouseLeave={e=>e.target.style.color=C.dim}
                  >{l}</button>
                ))}
              </div>
              <button onClick={()=>setView("login")} style={{
                background:C.lime,border:"none",color:"#0a0a0a",
                fontWeight:700,fontSize:14,padding:"10px 22px",
                borderRadius:40,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                display:"flex",alignItems:"center",gap:8,
                boxShadow:`0 0 24px ${C.lime}55`,transition:"all 0.22s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="#d4ff40";e.currentTarget.style.boxShadow=`0 0 40px ${C.lime}88`;}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.lime;e.currentTarget.style.boxShadow=`0 0 24px ${C.lime}55`;}}
              >
                Let's Connect
                <span style={{ width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,0.20)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>›</span>
              </button>
            </div>
          </footer>

        </div>
      )}
    </div>
  );
}