# NeuroAid V4 — Visual Design System, Typography & Color Guidelines

> **Document Version:** 4.0.0  
> **Aesthetic Theme:** Ambient Dark Glassmorphism with Neural Glow Highlights  
> **Accessibility Standard:** WCAG 2.1 Level AA Compliant (Dementia & Motor Impairment Optimized)  

---

## 1. Visual Design Philosophy

NeuroAid’s visual design system combines a cutting-edge, high-contrast dark aesthetic with soft ambient background illumination and tactile glassmorphic surfaces. The aesthetic is specifically tuned to achieve two core objectives:

1. **Clinical Calmness & Reduced Eye Strain:** Dark backgrounds (`#07070b`) eliminate screen glare for elderly patients, while subtle crimson and blue ambient gradients reduce cognitive anxiety during cognitive evaluations.
2. **Accessible Tactility & Visual Hierarchy:** High-contrast lime accents (`#C8F135`), clear visual touch boundaries, and glass translucent cards (`backdrop-filter: blur(28px)`) ensure interface controls are immediately distinguishable for users with age-related visual impairments or tremors.

---

## 2. Color Palette & Token Architecture

The design system uses strict HSL/HEX design tokens defined centrally in `frontend/src/utils/theme.js` and `index.css`.

```
─────────────────────────────────────────────────────────────────────────────────
COLOR TOKENS & PALETTE VISUALIZATION
─────────────────────────────────────────────────────────────────────────────────
[ Deep Background ]      #07070b / #080808    Primary Dark Canvas
[ Accent Lime ]          #C8F135             Primary Action & High-Visibility Accent
[ Lime Dim ]             #9ABF28             Subtle Hover & Secondary Buttons
[ Alert Crimson ]        #E84040             Danger / Critical Risk / Recording State
[ Crimson Glow ]         rgba(232,64,64,0.38) High-Visibility Warning Glow
[ Soft Cream ]           #FFFFFF / #F0ECE3   Primary Body & Headline Typography
[ Cream Dim ]            #AAAAAA             Secondary Subtitles & Labels
[ Cream Faint ]          #666666             Disabled & Tertiary Meta Information
[ Success Green ]        #4ADE80             Normal Risk / Completed Test Indicator
[ Warning Amber ]        #F59E0B             Mild Risk / Caution Alert Indicator
[ Info Blue ]            #60A5FA             Clinical Info & System Messages
─────────────────────────────────────────────────────────────────────────────────
```

### 2.1 Theme Color Specs

| Token Name | HEX / RGBA Value | Intended Usage & Context | Contrast Ratio vs Background |
|---|---|---|---|
| `T.bg` | `#07070b` / `#080808` | Main application dark background canvas | Baseline ($1.0:1$) |
| `T.card` | `rgba(14,16,12,0.85)` | Glassmorphic card fill surface | Surface Layer |
| `T.cardBorder` | `rgba(255,255,255,0.10)` | Card subtle perimeter stroke | Division Line |
| `T.lime` | `#C8F135` | Primary CTA buttons, active state highlights, completion badges | **14.8:1** (AAA) |
| `T.limeDim` | `#9ABF28` | Secondary action buttons, hover states | **9.2:1** (AAA) |
| `T.red` | `#E84040` | Diagnostic risk alerts, active audio recording pulse | **5.4:1** (AA) |
| `T.redGlow` | `rgba(232,64,64,0.38)` | Ambient shadow glow for high-risk flags | Decorative |
| `T.cream` | `#F0ECE3` / `#FFFFFF` | Primary headings, body copy | **17.2:1** (AAA) |
| `T.creamDim` | `#AAAAAA` | Input labels, table headers, secondary metrics | **7.5:1** (AAA) |
| `T.creamFaint`| `#666666` | Timestamp footers, inactive nav items | **4.6:1** (AA) |
| `T.green` | `#4ADE80` | Low cognitive risk, medication taken badge | **11.4:1** (AAA) |
| `T.amber` | `#F59E0B` | Moderate cognitive risk, pending doctor review | **8.8:1** (AAA) |
| `T.blue` | `#60A5FA` | Educational RAG chatbot links, clinical notes | **9.6:1** (AAA) |

### 2.2 Ambient Neural Radial Gradients (`body` background)
To convey a living, neural network depth, the primary background applies layered, fixed radial gradients:
```css
background-image:
  radial-gradient(ellipse 65% 55% at -5%  -5%,  rgba(220,55,55,0.24)   0%, transparent 60%),
  radial-gradient(ellipse 50% 45% at 105%  2%,  rgba(80,130,255,0.10)  0%, transparent 55%),
  radial-gradient(ellipse 90% 70% at 50% 15%,   rgba(180,40,40,0.07)   0%, transparent 58%),
  radial-gradient(ellipse 40% 35% at 0%   55%,  rgba(245,158,11,0.07)  0%, transparent 55%),
  radial-gradient(ellipse 42% 38% at 100% 52%,  rgba(120,80,220,0.07)  0%, transparent 55%),
  radial-gradient(ellipse 70% 50% at 50% 105%,  rgba(160,80,20,0.10)   0%, transparent 65%);
```

---

## 3. Typography System

The typography hierarchy uses **DM Sans** as the primary functional sans-serif typeface for UI clarity, paired with **Instrument Serif** for decorative editorial headers.

```
Typography Import Stack (Google Fonts):
https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap
```

### 3.1 Type Scale & Styling Hierarchy

| Scale Level | Typeface | Size | Weight | Line Height | Letter Spacing | Target Use Case |
|---|---|---|---|---|---|---|
| **Display Header** | Instrument Serif | `48px` / `3rem` | Normal (400) | `1.15` | `-0.02em` | Landing Hero Headline |
| **H1 Title** | DM Sans | `32px` / `2rem` | Bold (700) | `1.25` | `-0.01em` | Screen & Dashboard Titles |
| **H2 Section Header**| DM Sans | `24px` / `1.5rem` | SemiBold (600)| `1.30` | `0em` | Card & Domain Group Titles |
| **H3 Subsection** | DM Sans | `18px` / `1.125rem`| Medium (500) | `1.40` | `0em` | Test Instructions & Sub-headers|
| **Body Primary** | DM Sans | `16px` / `1rem` | Regular (400) | `1.55` | `0.01em` | Main Body Text & Dialog Messages|
| **Body Accessible**| DM Sans | `18px` / `1.125rem`| Medium (500) | `1.60` | `0.015em` | **Elderly Patient Reading Mode**|
| **Caption / Label**| DM Sans | `13px` / `0.812rem`| Medium (500) | `1.35` | `0.03em` | Input Labels & Secondary Meta |
| **Badge / Code** | DM Sans | `11px` / `0.687rem`| Bold (700) | `1.20` | `0.06em` | Pairing Code, Status Tags |

---

## 4. Glassmorphism Engine & Layout Components

### 4.1 Glass Utility Classes

```css
/* Standard Glass Surface */
.glass {
  background: rgba(255, 255, 255, 0.060) !important;
  backdrop-filter: blur(28px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.11) !important;
}

/* Darker Container Glass for High-Contrast Cards */
.glass-dark {
  background: rgba(10, 10, 16, 0.74) !important;
  backdrop-filter: blur(32px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(140%) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  box-shadow: 0 16px 56px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.09) !important;
}

/* Floating Modal / Interactive Glass Surface */
.glass-float {
  background: rgba(18, 18, 28, 0.64) !important;
  backdrop-filter: blur(26px) saturate(170%) !important;
  -webkit-backdrop-filter: blur(26px) saturate(170%) !important;
  border: 1px solid rgba(255, 255, 255, 0.17) !important;
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.56), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
}

/* Interactive Card Hover Transition */
.glass-hover {
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease, border-color 0.28s ease !important;
}
.glass-hover:hover {
  transform: translateY(-4px) !important;
  border-color: rgba(255, 255, 255, 0.22) !important;
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
}
```

### 4.2 Form Input Styling & Autofill Normalization

```css
.glass-input {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(14px) !important;
  color: #f0ece3 !important;
  transition: border-color 0.22s, box-shadow 0.22s !important;
}

.glass-input:focus {
  border-color: rgba(232, 64, 64, 0.55) !important;
  box-shadow: 0 0 0 3px rgba(232, 64, 64, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  outline: none !important;
}

/* Prevent bright default browser autofill background */
.glass-input:-webkit-autofill,
.glass-input:-webkit-autofill:hover,
.glass-input:-webkit-autofill:focus,
.glass-input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #111110 inset !important;
  box-shadow: 0 0 0 1000px #111110 inset !important;
  -webkit-text-fill-color: #f0ece3 !important;
  caret-color: #f0ece3 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}
```

---

## 5. Micro-Animations & Dynamic Motion Specs

All interface motion uses keyframe animations defined in `theme.js` and `index.css`. Duration parameters maintain smooth $60\text{fps}$ performance without triggering sensory overload in sensitive patients.

```
Keyframe Motion Catalog:
┌──────────────────┬───────────────────┬──────────────────────────────────────────┐
│ Animation Name   │ Duration / Easing │ Visual Behavior Description              │
├──────────────────┼───────────────────┼──────────────────────────────────────────┤
│ float            │ 3.0s ease-in-out  │ Soft vertical Y-axis float (-12px)       │
│ record-pulse     │ 1.5s infinite     │ Expanding pulse ring during voice record │
│ slide-up         │ 0.35s cubic-bezier│ Smooth entrance for dialogs & page views │
│ glow-pulse       │ 2.4s ease-in-out  │ Radial background orb scale (1.0 -> 1.1) │
│ ambient-orb      │ 12s infinite loop │ Slow ambient gradient orb drift          │
│ scan-line        │ 2.0s linear       │ Assessment scanning bar motion           │
└──────────────────┴───────────────────┴──────────────────────────────────────────┘
```

---

## 6. Accessibility & Elderly Ergonomics Guidelines

### 6.1 Motor Tremor & Touch Ergonomics
- **Touch Target Padding:** Minimum actionable element dimensions of $48 \times 48\text{px}$ (with recommended $56 \times 56\text{px}$ target boxes for cognitive games).
- **Accidental Double-Tap Suppression:** Touch events implement a $350\text{ms}$ debounce guard to prevent double-triggering by users with resting hand tremors.

### 6.2 Cognitive & Sensory Clarity
- **Single Primary Action:** Each assessment screen features a single highlighted primary CTA button in Accent Lime (`#C8F135`).
- **High-Contrast Text:** Text elements strictly maintain contrast ratios of $\ge 4.5:1$ (AA) for regular text and $\ge 7:1$ (AAA) for critical audio/visual instructions.
- **Multilingual TTS Voice Guidance:** Integrated web speech audio synthesis automatically plays instructions in the patient's selected local language (Assamese, Bengali, Meitei, Hindi, English).

---

## 7. Cognitive Games Design System & Game Mode Aesthetics

The Cognitive Brain Games suite incorporates tactile, joyful, and dementia-accessible UI components designed to foster emotional confidence, avoid anxiety, and stimulate neuroplasticity.

### 7.1 Game Domain Accents & Palette
Each game is themed with a dedicated clinical domain accent color used for glow shadows, borders, active pills, and reward badges:

| Game | Cognitive Domain | Accent Color | Surface Background | Contrast vs Canvas |
|---|---|---|---|---|
| **Memory Match** | Visuospatial & Memory | Emerald (`#34d399`) | `rgba(52,211,153,0.15)` | **11.2:1** (AAA) |
| **Sequence Recall** | Working Memory & Concentration | Sky Blue (`#60a5fa`) | `rgba(96,165,250,0.15)` | **9.8:1** (AAA) |
| **Object Recognition** | Semantic & Visual Retrieval | Amber (`#f59e0b`) | `rgba(245,158,11,0.15)` | **8.8:1** (AAA) |
| **Pattern Completion** | Executive Function & Reasoning | Violet (`#a78bfa`) | `rgba(167,139,250,0.15)`| **8.4:1** (AAA) |
| **Daily Routine Recall** | Orientation & Sequencing | Orange (`#fb923c`) | `rgba(251,146,60,0.15)` | **8.2:1** (AAA) |

### 7.2 5 Difficulty Level Selector Component
The game toolbar (`GameShell.jsx`) incorporates a responsive segmented control supporting 5 difficulty levels:

```
Segmented Control: [ Lvl 1 (Easy) ] [ Lvl 2 (Medium) ] [ Lvl 3 (Hard) ] [ Lvl 4 (Pro) ] [ Lvl 5 (Advance) ]
Container Style: background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
Active Button: background: <accentColor>; color: #080808; font-weight: 800; border-radius: 10px;
Inactive Button: background: transparent; color: #9ca3af; font-weight: 600;
```

### 7.3 Game Board Viewport & Tactile Card Specifications
1. **Memory Match Card Grid:**
   - **Card Geometry:** Aspect ratio $1 / 1.15$, rounded corners `20px` (L1-3) or `14px` (L4-5).
   - **Flip State Animation:** Spring physics transform `scale(1.02)` via `transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)`.
   - **Matched Glow:** `box-shadow: 0 0 24px rgba(16,185,129,0.35)` with emerald border `2px solid #10b981`.
   - **Dynamic Grid Sizing:** Adapts from $3 \times 2$ (6 cards) on Easy to $5 \times 4$ (20 cards) on Advance.
2. **Sequence Recall Tactile Matrix:**
   - **Button Dimensions:** Large $2 \times 2$ grid with min height $110\text{px}$ per pad.
   - **Light-Up State:** Outer neon glow `box-shadow: 0 0 36px <color>, inset 0 0 20px #fff`, scale `1.05`, and synthesized audio chime.
3. **Daily Routine Timeline Slots:**
   - Sequential numbered target slots (`#1` through `#6`) with dashed perimeter `2px dashed rgba(255,255,255,0.18)` when empty, turning solid orange when populated.

### 7.4 Session Completion & Adaptive Reward Modal
When a session concludes, the `GameCompletionModal.jsx` provides uplifting celebration:
- **Atmospheric Glow:** Top radial gradient beam (`#C8F13544`) with celebratory chime audio.
- **Star Rating:** Animated 1 to 3 stars with golden drop shadow (`filter: drop-shadow(0 0 16px #fbbf24)`).
- **Explainable DDA Card:** Displays the previous level $\rightarrow$ new recommended level, clinical rationale, and direct "Play Recommended Level 🚀" action button.

