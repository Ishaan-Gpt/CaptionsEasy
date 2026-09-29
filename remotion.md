# Remotion Text & Kinetic Typography Master Reference (`remotion.md`)

This document is the **definitive, exhaustive guide** to text manipulation, typography control, kinetic animations, and caption styling in [Remotion](https://www.remotion.dev).

---

## 📑 Table of Contents
1. [Core Mental Model: How Text Works in Remotion](#1-core-mental-model-how-text-works-in-remotion)
2. [Remotion's Golden Rules (What is Strictly Forbidden)](#2-remotions-golden-rules-what-is-strictly-forbidden)
3. [The Complete Remotion Text Toolkit (Built-in Packages)](#3-the-complete-remotion-text-toolkit-built-in-packages)
   - [3.1 `@remotion/captions` (Word-level Sync & TikTok Pages)](#31-remotioncaptions-word-level-sync--tiktok-pages)
   - [3.2 `@remotion/layout-utils` (Measurement & Auto-Fitting)](#32-remotionlayout-utils-measurement--auto-fitting)
   - [3.3 `@remotion/google-fonts` & Local Fonts](#33-remotiongoogle-fonts--local-fonts)
4. [Every Single Text Modification & CSS Control You Have](#4-every-single-text-modification--css-control-you-have)
   - [4.1 Font & Typography Properties](#41-font--typography-properties)
   - [4.2 Spacing & Metrics](#42-spacing--metrics)
   - [4.3 Colors, Gradients & Video Text Fill](#43-colors-gradients--video-text-fill)
   - [4.4 Strokes, Outlines & Shadow Stacks](#44-strokes-outlines--shadow-stacks)
   - [4.5 Transforms, Rotation & Anchor Points](#45-transforms-rotation--anchor-points)
   - [4.6 Masks, Clipping Paths & Reveals](#46-masks-clipping-paths--reveals)
   - [4.7 Blur, Glow & Visual Filters](#47-blur-glow--visual-filters)
5. [Text Animation Math: Hooks, Springs & Interpolation](#5-text-animation-math-hooks-springs--interpolation)
   - [5.1 `interpolate()` with Custom Easing](#51-interpolate-with-custom-easing)
   - [5.2 `spring()` Physics Configuration](#52-spring-physics-configuration)
   - [5.3 `interpolateColors()` for Dynamic Palette Transitions](#53-interpolatecolors-for-dynamic-palette-transitions)
6. [Granular Kinetic Typography Patterns](#6-granular-kinetic-typography-patterns)
   - [6.1 Character-Level (Typewriter, Staggered Waves, Matrix Scramble)](#61-character-level-typewriter-staggered-waves-matrix-scramble)
   - [6.2 Word-Level (Karaoke Highlight, Pop, Box Background Marker)](#62-word-level-karaoke-highlight-pop-box-background-marker)
   - [6.3 Line-Level (Sliding Mask Reveal, Teleprompter Scroll)](#63-line-level-sliding-mask-reveal-teleprompter-scroll)
7. [Advanced Text Modes: SVG Curved Text & 3D Extrusion](#7-advanced-text-modes-svg-curved-text--3d-extrusion)
   - [7.1 Curved Text on Paths (`<textPath>`)](#71-curved-text-on-paths-textpath)
   - [7.2 Handwritten Text Drawing (`strokeDashoffset`)](#72-handwritten-text-drawing-strokedashoffset)
   - [7.3 Real 3D Text (`@remotion/three` / Three.js)](#73-real-3d-text-remotionthree--threejs)
8. [The "Can Do" vs "Cannot Do" Boundary Matrix](#8-the-can-do-vs-cannot-do-boundary-matrix)
9. [Pre-Built Style Blueprints (MrBeast, Hormozi, Minimalist, Cyberpunk)](#9-pre-built-style-blueprints)

---

## 1. Core Mental Model: How Text Works in Remotion

In standard web applications, text animations rely on browser runtimes, CSS animations, and `requestAnimationFrame`. 

In **Remotion**, video is rendered **frame-by-frame (stills stitched into video)**.
- Frame 0, Frame 1, Frame 2... Frame $N$.
- A frame might take 20ms or 2 seconds to render depending on CPU/GPU load.
- Therefore, **time cannot be measured using real-time clocks**. It is purely a function of:
  $$\text{Current Time (seconds)} = \frac{\text{frame}}{\text{fps}}$$
- **Every single text modification is a direct mathematical mapping from `useCurrentFrame()` to a React style prop.**

```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const SimpleText = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Opacity transitions from 0 to 1 over the first 0.5 seconds (0.5 * fps frames)
  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  return <h1 style={{ opacity, fontSize: 80, color: "white" }}>Hello World</h1>;
};
```

---

## 2. Remotion's Golden Rules (What is Strictly Forbidden)

| ❌ FORBIDDEN in Remotion Text | Why It Fails | ✅ Correct Remotion Alternative |
|---|---|---|
| `transition: all 0.3s ease` | The browser renderer pauses time while rendering stills. CSS transitions freeze or skip frames entirely. | Use `interpolate(frame, ...)` or `spring()` directly on inline style properties. |
| `@keyframes myAnimation { ... }` | Keyframes run on the browser's hardware clock, not Remotion's frame timeline. Output video will have wildly inconsistent timing or drop frames. | Compute values per-frame using `useCurrentFrame()`. |
| Tailwind animation utilities (`animate-bounce`, `animate-pulse`) | These compile to `@keyframes` and will desync or freeze. | Use inline styles with `interpolate()` or `spring()` for the dynamic motion properties. |
| `setTimeout()` or `setInterval()` | Asynchronous timers do not wait for frame captures, rendering blank or corrupted frames. | Calculate current state from `frame`. |
| `Date.now()` or `performance.now()` | Non-deterministic; will produce different renders on local vs cloud. | Use `frame / fps` for seconds, or `(frame / fps) * 1000` for milliseconds. |
| Per-character opacity for Typewriter | Causes font kerning shifts and jumping punctuation marks as letters pop in. | Use string slicing: `text.slice(0, currentChars)`. |

---

## 3. The Complete Remotion Text Toolkit (Built-in Packages)

### 3.1 `@remotion/captions` (Word-level Sync & TikTok Pages)
Install: `npx remotion add @remotion/captions`

Provides native data structures and pagination algorithms for karaoke captions (Whisper timestamps).

#### Core Types:
```ts
export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs?: number | null;
  confidence?: number | null;
};

export type TikTokPage = {
  startMs: number;
  tokens: Array<{
    text: string;
    fromMs: number;
    toMs: number;
  }>;
};
```

#### Pagination Engine:
```tsx
import { useMemo } from "react";
import { createTikTokStyleCaptions } from "@remotion/captions";

// Groups word-level captions into screen-sized chunks (e.g., 1.2s per screen)
const { pages } = useMemo(() => {
  return createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: 1200, // lower = fewer words, higher = full sentences
  });
}, [captions]);
```

---

### 3.2 `@remotion/layout-utils` (Measurement & Auto-Fitting)
Install: `npx remotion add @remotion/layout-utils`

Remotion provides canvas-backed layout utilities that measure exact bounding boxes *before* rendering.

#### 1. `measureText({ text, fontFamily, fontSize, fontWeight, ... })`
Calculates exact width and height of text without mounting DOM elements:
```tsx
import { measureText } from "@remotion/layout-utils";

const { width, height } = measureText({
  text: "KINETIC TYPOGRAPHY",
  fontFamily: "Inter",
  fontSize: 64,
  fontWeight: "bold",
  letterSpacing: "2px",
});
// width -> 682.4
// height -> 77.2
```

#### 2. `fitText({ text, withinWidth, fontFamily, ... })`
Dynamically calculates the largest font size that fits into a bounding box:
```tsx
import { fitText } from "@remotion/layout-utils";

const { fontSize } = fitText({
  text: "THIS HEADLINE WILL NEVER OVERFLOW OR WRAP",
  withinWidth: 900,
  fontFamily: "Montserrat",
  fontWeight: 900,
});

// Render with the computed optimal size
<h1 style={{ fontSize: Math.min(fontSize, 110), fontFamily: "Montserrat" }}>
  THIS HEADLINE WILL NEVER OVERFLOW OR WRAP
</h1>
```

#### 3. `fillTextBox({ maxBoxWidth, maxLines })`
Calculates safe line wraps for multi-word subtitles:
```tsx
import { fillTextBox } from "@remotion/layout-utils";

const box = fillTextBox({ maxBoxWidth: 700, maxLines: 2 });
const words = ["Mastering", "dynamic", "motion", "graphics", "with", "Remotion"];

const fittingWords: string[] = [];
for (const word of words) {
  const { exceedsBox } = box.add({
    text: word + " ",
    fontFamily: "Inter",
    fontSize: 48,
  });
  if (exceedsBox) break;
  fittingWords.push(word);
}
```

---

### 3.3 `@remotion/google-fonts` & Local Fonts
Fonts must be preloaded before measurement and rendering to prevent fallback-font flicker.

#### Google Fonts:
```bash
npx remotion add @remotion/google-fonts
```
```tsx
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

// In composition:
await waitUntilDone(); // Ensures font binary is loaded into memory
```

#### Local Fonts (Custom TTF/WOFF2):
```tsx
import { staticFile } from "remotion";

const font = new FontFace(
  "CustomBrandFont",
  `url(${staticFile("fonts/BrandFont.woff2")}) format('woff2')`
);

font.load().then((loadedFont) => {
  document.fonts.add(loadedFont);
});
```

---

## 4. Every Single Text Modification & CSS Control You Have

Because Remotion outputs standard React HTML, **every modern CSS typography property is 100% controllable per frame**.

### 4.1 Font & Typography Properties
| Property | Type / Units | Frame Animatable? | Practical Kinetic Use Case |
|---|---|---|---|
| `fontSize` | `number \| string` (`px`, `rem`, `vw`) | ✅ Yes | Zoom pops, dynamic emphasis on hero words |
| `fontWeight` | `100` – `900` | ✅ Yes (discrete/stepped) | Thickening on audio punch/stress |
| `fontStyle` | `'normal' \| 'italic' \| 'oblique'` | ✅ Yes (discrete) | Quotes or tone shifts |
| `fontStretch` | `'condensed' \| 'expanded'` | ✅ Yes (variable fonts) | Elastic breathing text |
| `fontFamily` | `string` | ✅ Yes (swapping) | Glitch effect switching between Serif & Sans |
| `textTransform` | `'uppercase' \| 'lowercase' \| 'capitalize'` | ✅ Yes | Dramatic headline pop |

---

### 4.2 Spacing & Metrics
| Property | Units | Frame Animatable? | Practical Kinetic Use Case |
|---|---|---|---|
| `letterSpacing` | `px`, `em` | ✅ Yes | **Cinematic reveal**: expand tracking from `-5px` to `15px` as text fades in |
| `wordSpacing` | `px` | ✅ Yes | Grouping or breathing pauses between phrases |
| `lineHeight` | unitless, `px`, `%` | ✅ Yes | Expanding multi-line subtitles vertically |
| `textAlign` | `'left' \| 'center' \| 'right' \| 'justify'` | ✅ Yes | Directional alignments |
| `whiteSpace` | `'pre' \| 'nowrap' \| 'pre-wrap'` | Static | **Crucial**: Always use `'pre'` with token arrays to retain word spacing |

---

### 4.3 Colors, Gradients & Video Text Fill
```tsx
// 1. Solid Animated Color
style={{ color: interpolateColors(frame, [0, 30], ["#ffffff", "#22c55e"]) }}

// 2. Animated Gradient Text Fill
const angle = interpolate(frame, [0, 60], [0, 360]);
style={{
  background: `linear-gradient(${angle}deg, #ec4899, #8b5cf6)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
}}

// 3. Video Fill Inside Text (Knockout Text)
// Wrap text in a mix-blend container or SVG mask over a <Video />
```

---

### 4.4 Strokes, Outlines & Shadow Stacks
Crucial for readability on top of bright or chaotic video backgrounds.

```tsx
// 1. Text Stroke (Outline)
style={{
  WebkitTextStroke: "4px #000000",
  paintOrder: "stroke fill", // Renders stroke behind fill so letters don't get thin
  color: "#ffffff",
}}

// 2. MrBeast Thick Comic Outline Stack (Using Multiple Text-Shadows)
style={{
  textShadow: `
    -4px -4px 0 #000,  
     4px -4px 0 #000,
    -4px  4px 0 #000,
     4px  4px 0 #000,
     0px  8px 0 #000,
     0px 12px 20px rgba(0,0,0,0.8)
  `,
}}

// 3. Cyberpunk Neon Glow
const glowRadius = interpolate(frame, [0, 15, 30], [5, 25, 5]);
style={{
  textShadow: `0 0 ${glowRadius}px #00ffff, 0 0 ${glowRadius * 2}px #00ffff`,
  color: "#ffffff",
}}
```

---

### 4.5 Transforms, Rotation & Anchor Points
> **Remotion Best Practice**: Always animate individual CSS transform properties (`scale`, `translate`, `rotate`) rather than constructing `transform: "scale(...) translate(...)"`.

```tsx
style={{
  display: "inline-block", // Required for transforms on inline spans!
  transformOrigin: "center bottom", // Anchor point: bounce from floor
  scale: spring({ frame, fps, config: { damping: 12, stiffness: 200 } }),
  rotate: `${interpolate(frame, [0, 20], [-8, 0])}deg`,
  translate: `0px ${interpolate(frame, [0, 15], [30, 0])}px`,
}}
```

---

### 4.6 Masks, Clipping Paths & Reveals
Create high-end motion design reveals without needing After Effects.

```tsx
// 1. Sliding Curtain Reveal (Text rises from behind an invisible floor)
<div style={{ overflow: "hidden" }}>
  <div style={{ translate: `0px ${interpolate(frame, [0, 20], [100, 0])}%` }}>
    REVEALED TEXT
  </div>
</div>

// 2. Diagonal Slanted Clip Path Reveal
const progress = interpolate(frame, [0, 30], [0, 100], { extrapolateRight: "clamp" });
style={{
  clipPath: `polygon(0 0, ${progress}% 0, ${Math.max(0, progress - 10)}% 100%, 0% 100%)`,
}}
```

---

### 4.7 Blur, Glow & Visual Filters
```tsx
const blurAmount = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });
const opacity = interpolate(frame, [0, 20], [0, 1]);

style={{
  filter: `blur(${blurAmount}px)`,
  opacity,
}}
```

---

## 5. Text Animation Math: Hooks, Springs & Interpolation

### 5.1 `interpolate()` with Custom Easing
```tsx
import { interpolate, Easing } from "remotion";

const progress = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1), // Apple-style snappy overshoot
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

### 5.2 `spring()` Physics Configuration
```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const scale = spring({
  frame,
  fps,
  config: {
    damping: 10,       // Lower = more bounce oscillations (10-15 is great for pop)
    stiffness: 180,    // Higher = faster, snappier snap (150-300)
    mass: 0.8,         // Lower = lighter, quicker
    overshootClamping: false, // Set true to strictly forbid bouncing beyond 1.0
  },
});
```

### 5.3 `interpolateColors()` for Dynamic Palette Transitions
```tsx
import { interpolateColors } from "remotion";

const activeColor = interpolateColors(
  frame,
  [0, 15, 30],
  ["#ffffff", "#facc15", "#22c55e"] // White -> Yellow -> Green
);
```

---

## 6. Granular Kinetic Typography Patterns

### 6.1 Character-Level

#### 1. Clean Typewriter with Blinking Cursor
> **Rule**: Always slice strings; never use opacity per character.
```tsx
import { useCurrentFrame } from "remotion";

export const Typewriter = ({ text = "CaptionsEasy renders AI kinetic video." }) => {
  const frame = useCurrentFrame();
  const charsPerSecond = 20;
  const currentChars = Math.floor((frame / 30) * charsPerSecond);
  const displayedText = text.slice(0, currentChars);
  const showCursor = Math.floor(frame / 15) % 2 === 0;

  return (
    <div style={{ fontFamily: "monospace", fontSize: 48, color: "#fff" }}>
      {displayedText}
      <span style={{ opacity: showCursor ? 1 : 0, color: "#38bdf8" }}>▌</span>
    </div>
  );
};
```

#### 2. Staggered Wave (Letter-by-Letter Pop)
```tsx
export const StaggeredLetters = ({ text = "KINETIC" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {text.split("").map((char, index) => {
        const delay = index * 3; // 3 frame delay per letter
        const charFrame = Math.max(0, frame - delay);
        
        const scale = spring({
          frame: charFrame,
          fps,
          config: { damping: 10, stiffness: 220 },
        });

        const opacity = interpolate(charFrame, [0, 5], [0, 1], {
          extrapolateRight: "clamp",
        });

        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              scale,
              opacity,
              fontSize: 72,
              fontWeight: 900,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
```

---

### 6.2 Word-Level (Karaoke & TikTok Captions)

#### 1. Active Word Karaoke Bounce & Color Flood
```tsx
export const KaraokeLine = ({ words, currentTimeMs }) => {
  return (
    <div style={{ fontSize: 64, fontWeight: 900, whiteSpace: "pre" }}>
      {words.map((word, idx) => {
        const isActive = currentTimeMs >= word.startMs && currentTimeMs <= word.endMs;
        const isPast = currentTimeMs > word.endMs;

        return (
          <span
            key={idx}
            style={{
              display: "inline-block",
              color: isActive ? "#facc15" : isPast ? "#ffffff" : "rgba(255,255,255,0.4)",
              scale: isActive ? 1.15 : 1.0,
              rotate: isActive ? "-2deg" : "0deg",
              transition: "none", // Remotion-safe
              textShadow: isActive ? "0px 0px 25px rgba(250,204,21,0.6)" : "none",
            }}
          >
            {word.text + " "}
          </span>
        );
      })}
    </div>
  );
};
```

#### 2. Highlighter Pen Box Behind Active Word
```tsx
export const HighlightBoxWord = ({ word, isActive, frame }) => {
  // Width grows from 0% to 100% when active
  const boxWidth = isActive
    ? `${interpolate(frame % 20, [0, 10], [0, 100], { extrapolateRight: "clamp" })}%`
    : "0%";

  return (
    <span style={{ position: "relative", display: "inline-block", margin: "0 8px" }}>
      {/* Background Highlight Marker */}
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: "10%",
          height: "80%",
          width: boxWidth,
          backgroundColor: "#38bdf8",
          borderRadius: "6px",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1, color: isActive ? "#000" : "#fff" }}>
        {word}
      </span>
    </span>
  );
};
```

---

### 6.3 Line-Level

#### 1. Sliding Floor Mask (Lines Rise Up)
```tsx
export const LineByLineReveal = ({ lines = ["AI CAPTIONING", "REINVENTED FOR CREATORS"] }) => {
  const frame = useCurrentFrame();

  return (
    <div>
      {lines.map((line, i) => {
        const translateY = interpolate(frame - i * 15, [0, 20], [100, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div key={i} style={{ overflow: "hidden", height: "90px" }}>
            <h1
              style={{
                translate: `0px ${translateY}%`,
                fontSize: 64,
                fontWeight: 900,
                margin: 0,
              }}
            >
              {line}
            </h1>
          </div>
        );
      })}
    </div>
  );
};
```

---

## 7. Advanced Text Modes: SVG Curved Text & 3D Extrusion

### 7.1 Curved Text on Paths (`<textPath>`)
Standard HTML does not support text along an arbitrary circle or Bézier curve. Remotion supports inline SVG `<textPath>`:

```tsx
export const CircularText = () => {
  const frame = useCurrentFrame();
  const startOffset = `${(frame * 0.5) % 100}%`;

  return (
    <svg width="600" height="600" viewBox="0 0 600 600">
      <path
        id="circlePath"
        d="M 300, 300 m -200, 0 a 200,200 0 1,1 400,0 a 200,200 0 1,1 -400,0"
        fill="none"
      />
      <text fill="#ffffff" fontSize="28" fontWeight="bold" letterSpacing="4px">
        <textPath href="#circlePath" startOffset={startOffset}>
          • MOTIONAI • AUTOMATIC KINETIC SUBTITLES • STUDIO QUALITY
        </textPath>
      </text>
    </svg>
  );
};
```

### 7.2 Handwritten Text Drawing (`strokeDashoffset`)
Convert typography to SVG paths, then animate stroke length:
```tsx
const strokeDashoffset = interpolate(frame, [0, 45], [1000, 0], {
  extrapolateRight: "clamp",
});

<path
  d="M..."
  stroke="#00f2fe"
  strokeWidth="6"
  fill="none"
  strokeDasharray="1000"
  strokeDashoffset={strokeDashoffset}
/>
```

### 7.3 Real 3D Text (`@remotion/three` / Three.js)
Using `@react-three/fiber` and `@react-three/drei` inside Remotion:
```tsx
import { ThreeCanvas } from "@remotion/three";
import { Text3D, Center } from "@react-three/drei";
import { useCurrentFrame } from "remotion";

export const Title3D = () => {
  const frame = useCurrentFrame();

  return (
    <ThreeCanvas width={1920} height={1080}>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      <Center>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={1.5}
          height={0.4}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.03}
          rotation={[0, frame * 0.02, 0]} // Smooth 3D Y-axis spinning
        >
          MOTIONAI
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
        </Text3D>
      </Center>
    </ThreeCanvas>
  );
};
```

---

## 8. The "Can Do" vs "Cannot Do" Boundary Matrix

| Capability | Supported in Remotion? | Technical Method / Solution |
|---|:---:|---|
| **Frame-perfect Audio Sync** | ✅ YES | Millisecond to frame conversion: `(token.startMs / 1000) * fps` |
| **Physics Springs (Bounces)** | ✅ YES | `spring({ frame, fps, config: { damping, stiffness } })` |
| **Thick Video Outlines** | ✅ YES | `-webkit-text-stroke` or multiple `text-shadow` coordinates |
| **Gradient / Video Fill** | ✅ YES | `-webkit-background-clip: text` or SVG clipping masks |
| **Dynamic Auto-Font Sizing** | ✅ YES | `@remotion/layout-utils` -> `fitText()` |
| **Curved / Path Text** | ✅ YES | SVG `<textPath>` embedded directly in composition |
| **3D Extruded Beveled Text** | ✅ YES | `@remotion/three` with `Text3D` geometry |
| **Native After Effects `.mogrt`** | ❌ NO | Remotion uses React components, not Adobe proprietary runtimes |
| **CSS `transition: 0.3s`** | ❌ NO | Broken in video renders; must use frame math |
| **Pure CSS `@keyframes`** | ❌ NO | Out of sync with video clock; must use frame math |
| **Natural Automatic Kerning Shifting** | ⚠️ CAUTION | Character-level animations can shift layout unless `inline-block` + fixed widths or string slicing is used |

---

## 9. Pre-Built Style Blueprints

### Blueprint 1: The "MrBeast" Pop
- **Font**: Montserrat ExtraBold / Komika Axis / Bangers
- **Color**: `#FFF200` (Electric Yellow) or `#FFFFFF`
- **Stroke**: `5px #000000` (`paintOrder: "stroke fill"`)
- **Shadow**: `0px 8px 0px #000000`
- **Animation**: Pop in with slight overshoot (`damping: 11, stiffness: 240`), rotate `-3deg`.

### Blueprint 2: The "Hormozi" High-Intensity
- **Font**: Impact / Anton / Montserrat 900
- **Transform**: `text-transform: uppercase;`
- **Chunk Size**: 1 to 3 words maximum per screen.
- **Coloring**: Inactive words are solid `#FFFFFF`, current active word is `#22C55E` (Fluorescent Green) or `#FF0055` (Crimson) with a glowing box marker behind it.

### Blueprint 3: The "Ali Abdaal" Minimalist Clean
- **Font**: Inter / Cabinet Grotesk / SF Pro
- **Color**: `#FFFFFF` with muted `#6B7280` inactive tokens.
- **Motion**: Subtle scale `1.0 -> 1.04` and `translateY(10px -> 0px)` using `Easing.bezier(0.16, 1, 0.3, 1)`. No violent bouncing. Soft backdrop blur pill container (`backdropFilter: blur(16px)`).

### Blueprint 4: The "Cyberpunk / Hacker" Terminal
- **Font**: JetBrains Mono / Fira Code
- **Color**: `#00FF66` or `#00F0FF`
- **Technique**: Character slicing typewriter with a 15-frame periodic flashing cursor (`▌`), subtle scanline overlay, and occasional 1-frame chromatic aberration glitch (`textShadow: "2px 0 red, -2px 0 cyan"`).

---

*This document serves as the foundational text manipulation manual for MotionAI / CaptionsEasy.*
