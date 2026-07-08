"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Sliders, Type, Sparkles, Film, BookOpen, 
  Code, Play, Pause, RotateCcw, Eye, ChevronDown, 
  Search, Check, Info, Smartphone, Grid, Copy, Sparkle,
  BarChart2, Volume2, Settings, Terminal, HelpCircle, Loader2
} from "lucide-react";

// Categorized Google Fonts
const FONT_CATEGORIES = {
  "Modern / Sans-serif": [
    "Outfit", "Inter", "Montserrat", "Poppins", "Roboto", "Lato", "Open Sans", "Nunito"
  ],
  "Heavy / Bold / Display": [
    "Anton", "Bungee", "Lilita One", "Titan One", "Archivo Black", "Luckiest Guy", "Fredoka"
  ],
  "Curvy / Handwriting": [
    "Caveat", "Permanent Marker", "Pacifico", "Kalam", "Dancing Script", "Satisfy"
  ],
  "Elegant / Serif": [
    "Playfair Display", "Lora", "Merriweather", "Georgia", "Cinzel", "Cormorant Garamond"
  ],
  "Monospace / Retro": [
    "JetBrains Mono", "Fira Code", "Space Mono", "VT323", "Courier Prime", "Special Elite"
  ]
};

const ALL_FONTS = Object.values(FONT_CATEGORIES).flat();

const getFontCategoryTag = (font: string) => {
  for (const [cat, list] of Object.entries(FONT_CATEGORIES)) {
    if (list.includes(font)) return cat.split(" / ")[0];
  }
  return "Modern";
};

// 15 Animations List
const ANIMATIONS_LIST = [
  { id: "spring-pop", name: "Spring Pop", category: "Entrances", desc: "Physics spring pop-in." },
  { id: "fade-in", name: "Smooth Fade", category: "Entrances", desc: "Linear opacity crossfade." },
  { id: "slide-up", name: "Slide Up", category: "Entrances", desc: "Vertical translate reveal." },
  { id: "slide-right", name: "Slide Right", category: "Entrances", desc: "Horizontal translate reveal." },
  { id: "rotate-in", name: "Rotation Spin", category: "Entrances", desc: "Z-axis rotational pop." },
  { id: "scale-stretch", name: "Elastic Stretch", category: "Entrances", desc: "Scale X/Y rebound stretch." },
  { id: "flip-3d", name: "3D Perspective Flip", category: "Reveals", desc: "Card rotation along X-axis." },
  { id: "typewriter", name: "Typewriter Reveal", category: "Reveals", desc: "Character sequence write-in." },
  { id: "blur-reveal", name: "Blur Fade", category: "Reveals", desc: "Gaussian blur to focus lens." },
  { id: "tracking-stretch", name: "Tracking Stretch", category: "Effects", desc: "Letter spacing animation." },
  { id: "neon-flicker", name: "Flicker Ignition", category: "Effects", desc: "Neon sign voltage flicker." },
  { id: "shimmer", name: "Metallic Sweep", category: "Effects", desc: "Gold reflection sweep." },
  { id: "shake-glitch", name: "Glitch Jitter", category: "Effects", desc: "RGB color channel split shift." },
  { id: "bounce-entrance", name: "Gravity Bounce", category: "Entrances", desc: "Baseline bounce drop." },
  { id: "stagger-letter", name: "Staggered Letters", category: "Letter-level", desc: "delayed springs per character." }
];

// Presets
const STYLE_PRESETS = [
  {
    name: "Cinematic Emerald",
    id: "cinematic_emerald",
    primaryFont: "Montserrat",
    primarySize: 24,
    primaryColor: "#FFFFFF",
    primaryColorMode: "solid",
    primaryWeight: "600",
    secondaryFont: "Playfair Display",
    secondarySize: 32,
    secondaryColor1: "#00F5C4",
    secondaryColor2: "#00C2A0",
    secondaryColorMode: "gradient-text",
    secondaryWeight: "900",
    bgType: "none",
  },
  {
    name: "Cartoon Bubble",
    id: "cartoon_bubble",
    primaryFont: "Fredoka",
    primarySize: 28,
    primaryColor: "#FFFFFF",
    primaryColorMode: "solid",
    primaryWeight: "700",
    secondaryFont: "Bungee",
    secondarySize: 34,
    secondaryColor1: "#FFB800",
    secondaryColorMode: "solid",
    secondaryWeight: "900",
    secondaryStrokeColor: "#111317",
    secondaryStrokeThickness: 4,
    bgType: "none",
  }
];

// Dynamic injector for web fonts
const ensureFontLoaded = (fontFamily: string) => {
  if (typeof window === "undefined" || !fontFamily) return;
  const id = `gf-test-${fontFamily.toLowerCase().replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@400;700;800;900&display=swap`;
  document.head.appendChild(link);
};

export default function RemotionDocumentationExplorer() {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof FONT_CATEGORIES>("Modern / Sans-serif");
  
  // Navigation tabs for explorer depth
  const [explorerTab, setExplorerTab] = useState<"typography" | "timing" | "sequencing" | "effects" | "audio" | "cli" | "hooks">("typography");

  // Custom font picker overlays
  const [fontPickerTarget, setFontPickerTarget] = useState<"primary" | "secondary" | "speaker" | null>(null);
  const [fontSearch, setFontSearch] = useState("");
  const fontPickerRef = useRef<HTMLDivElement | null>(null);

  // Playback engine
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const totalFrames = 60;
  const fps = 30;

  // Sandbox strings & styles
  const [text, setText] = useState("Explore [CREATIVE] typography rendering on local timeline.");
  const [editTarget, setEditTarget] = useState<"primary" | "secondary" | "speaker">("primary");
  const [activeTestType, setActiveTestType] = useState<"standard" | "speaker-badge" | "dual-track" | "karaoke">("standard");
  const [activeRatio, setActiveRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [showGridOverlay, setShowGridOverlay] = useState<"none" | "tiktok" | "reels">("none");
  const [boxEditMode, setBoxEditMode] = useState(true);

  // Primary Typography styles
  const [primaryFont, setPrimaryFont] = useState("Outfit");
  const [primarySize, setPrimarySize] = useState(24);
  const [primaryWeight, setPrimaryWeight] = useState("800");
  const [primaryColorMode, setPrimaryColorMode] = useState<"solid" | "gradient-text">("solid");
  const [primaryColor1, setPrimaryColor1] = useState("#FFFFFF");
  const [primaryColor2, setPrimaryColor2] = useState("#8A8F98");
  const [primaryCasing, setPrimaryCasing] = useState<"none" | "uppercase" | "lowercase" | "capitalize">("none");
  const [primaryUnderline, setPrimaryUnderline] = useState(false);
  const [primaryLetterSpacing, setPrimaryLetterSpacing] = useState(0);
  const [primaryWordSpacing, setPrimaryWordSpacing] = useState(4);
  const [primaryLineSpacing, setPrimaryLineSpacing] = useState(1.1);
  const [primaryStrokeEnabled, setPrimaryStrokeEnabled] = useState(true);
  const [primaryStrokeThickness, setPrimaryStrokeThickness] = useState(1.5);
  const [primaryStrokeColor, setPrimaryStrokeColor] = useState("#000000");
  const [primaryShadowEnabled, setPrimaryShadowEnabled] = useState(true);
  const [primaryShadowX, setPrimaryShadowX] = useState(0);
  const [primaryShadowY, setPrimaryShadowY] = useState(3);
  const [primaryShadowBlur, setPrimaryShadowBlur] = useState(6);
  const [primaryShadowColor, setPrimaryShadowColor] = useState("rgba(0,0,0,0.5)");

  // Secondary Typography styles
  const [secondaryFont, setSecondaryFont] = useState("Anton");
  const [secondarySize, setSecondarySize] = useState(32);
  const [secondaryWeight, setSecondaryWeight] = useState("900");
  const [secondaryColorMode, setSecondaryColorMode] = useState<"solid" | "gradient-text">("gradient-text");
  const [secondaryColor1, setSecondaryColor1] = useState("#00F5C4");
  const [secondaryColor2, setSecondaryColor2] = useState("#FFB800");
  const [secondaryCasing, setSecondaryCasing] = useState<"none" | "uppercase" | "lowercase" | "capitalize">("uppercase");
  const [secondaryUnderline, setSecondaryUnderline] = useState(false);
  const [secondaryLetterSpacing, setSecondaryLetterSpacing] = useState(1);
  const [secondaryWordSpacing, setSecondaryWordSpacing] = useState(4);
  const [secondaryLineSpacing, setSecondaryLineSpacing] = useState(1.1);
  const [secondaryStrokeEnabled, setSecondaryStrokeEnabled] = useState(true);
  const [secondaryStrokeThickness, setSecondaryStrokeThickness] = useState(3);
  const [secondaryStrokeColor, setSecondaryStrokeColor] = useState("#000000");
  const [secondaryShadowEnabled, setSecondaryShadowEnabled] = useState(true);
  const [secondaryShadowX, setSecondaryShadowX] = useState(0);
  const [secondaryShadowY, setSecondaryShadowY] = useState(4);
  const [secondaryShadowBlur, setSecondaryShadowBlur] = useState(10);
  const [secondaryShadowColor, setSecondaryShadowColor] = useState("rgba(0,0,0,0.6)");

  // Nested Speaker Badge Box styles
  const [speakerText, setSpeakerText] = useState("[SPEAKER]");
  const [speakerFont, setSpeakerFont] = useState("Space Mono");
  const [speakerSize, setSpeakerSize] = useState(12);
  const [speakerWeight, setSpeakerWeight] = useState("700");
  const [speakerColor, setSpeakerColor] = useState("#FFB800");
  const [speakerBgColor, setSpeakerBgColor] = useState("rgba(17, 19, 23, 0.85)");

  // Bounding Box margins & layouts (Nested setup)
  const [safeTop, setSafeTop] = useState<number>(30);
  const [safeBottom, setSafeBottom] = useState<number>(50);
  const [safeLeft, setSafeLeft] = useState<number>(20);
  const [safeRight, setSafeRight] = useState<number>(20);

  const [captionBoxTop, setCaptionBoxTop] = useState<number>(120);
  const [captionBoxBottom, setCaptionBoxBottom] = useState<number>(140);
  const [captionBoxLeft, setCaptionBoxLeft] = useState<number>(25);
  const [captionBoxRight, setCaptionBoxRight] = useState<number>(25);

  const [speakerBoxLeft, setSpeakerBoxLeft] = useState<number>(80);
  const [speakerBoxRight, setSpeakerBoxRight] = useState<number>(80);
  const [speakerBoxTop, setSpeakerBoxTop] = useState<number>(50);

  // Advanced Animation Physics Settings
  const [animationType, setAnimationType] = useState<string>("spring-pop");
  const [springStiffness, setSpringStiffness] = useState<number>(120);
  const [springDamping, setSpringDamping] = useState<number>(10);
  const [springMass, setSpringMass] = useState<number>(0.4);
  const [animDelay, setAnimDelay] = useState<number>(10);

  // Background Container States
  const [bgType, setBgType] = useState<"none" | "pill" | "shadow-box">("none");
  const [bgPaddingX, setBgPaddingX] = useState(20);
  const [bgPaddingY, setBgPaddingY] = useState(10);
  const [bgColor, setBgColor] = useState("rgba(10, 11, 13, 0.9)");

  // Interpolation & Bezier sliders state
  const [bezierX1, setBezierX1] = useState(0.16);
  const [bezierY1, setBezierY1] = useState(1.0);
  const [bezierX2, setBezierX2] = useState(0.3);
  const [bezierY2, setBezierY2] = useState(1.0);
  const [extrapolateLeft, setExtrapolateLeft] = useState<"clamp" | "extend" | "identity">("clamp");
  const [extrapolateRight, setExtrapolateRight] = useState<"clamp" | "extend" | "identity">("clamp");

  // WebGL filters simulation strengths
  const [blurStrength, setBlurStrength] = useState(0);
  const [chromaticAberrationStrength, setChromaticAberrationStrength] = useState(0);
  const [noiseStrength, setNoiseStrength] = useState(0);
  const [vignetteStrength, setVignetteStrength] = useState(0);
  const [greenScreenEnabled, setGreenScreenEnabled] = useState(false);

  // Audio configuration
  const [audioVolume, setAudioVolume] = useState(80);

  // CLI variables
  const [cliCodec, setCliCodec] = useState("h264");
  const [cliScale, setCliScale] = useState("1");
  const [cliQuality, setCliQuality] = useState("80");
  const [cliFormat, setCliFormat] = useState("mp4");

  // Hook simulated delay loading state
  const [isDelayActive, setIsDelayActive] = useState(false);
  const [delayCountdown, setDelayCountdown] = useState(0);

  // Copy indicators
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Drag boundaries refs
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dragHandle, setDragHandle] = useState<{ box: "safe" | "caption" | "speaker"; side: "top" | "bottom" | "left" | "right" } | null>(null);

  // Preloaders
  useEffect(() => {
    setMounted(true);
    ALL_FONTS.forEach(f => ensureFontLoaded(f));

    const handleOutsideClick = (e: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setFontPickerTarget(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Frame ticker loops (30 fps)
  useEffect(() => {
    if (!isPlaying || isDelayActive) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, isDelayActive]);

  // Handle delay render countdown simulation
  useEffect(() => {
    if (!isDelayActive) return;
    const timer = setInterval(() => {
      setDelayCountdown((prev) => {
        if (prev <= 1) {
          setIsDelayActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isDelayActive]);

  // Drag operations
  useEffect(() => {
    if (!dragHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const { box, side } = dragHandle;

      if (box === "safe") {
        if (side === "top") setSafeTop(Math.max(5, Math.min(mouseY, rect.height - safeBottom - 100)));
        else if (side === "bottom") setSafeBottom(Math.max(5, Math.min(rect.height - mouseY, rect.height - safeTop - 100)));
        else if (side === "left") setSafeLeft(Math.max(5, Math.min(mouseX, rect.width - safeRight - 100)));
        else if (side === "right") setSafeRight(Math.max(5, Math.min(rect.width - mouseX, rect.width - safeLeft - 100)));
      } 
      else if (box === "caption") {
        const topBound = safeTop;
        const bottomBound = rect.height - safeBottom;
        const leftBound = safeLeft;
        const rightBound = rect.width - safeRight;

        if (side === "top") {
          setCaptionBoxTop(Math.max(topBound + 5, Math.min(mouseY, bottomBound - captionBoxBottom - 30)));
        } else if (side === "bottom") {
          setCaptionBoxBottom(Math.max(5, Math.min(rect.height - mouseY, rect.height - captionBoxTop - 30)));
        } else if (side === "left") {
          setCaptionBoxLeft(Math.max(leftBound + 5, Math.min(mouseX, rightBound - captionBoxRight - 50)));
        } else if (side === "right") {
          setCaptionBoxRight(Math.max(5, Math.min(rect.width - mouseX, rect.width - captionBoxLeft - 50)));
        }
      }
      else if (box === "speaker") {
        const topBound = safeTop;
        if (side === "top") {
          setSpeakerBoxTop(Math.max(topBound + 5, Math.min(mouseY, rect.height - safeBottom - 150)));
        } else if (side === "left") {
          setSpeakerBoxLeft(Math.max(safeLeft + 5, Math.min(mouseX, rect.width - safeRight - speakerBoxRight - 20)));
        } else if (side === "right") {
          setSpeakerBoxRight(Math.max(5, Math.min(rect.width - mouseX, rect.width - safeLeft - speakerBoxLeft - 20)));
        }
      }
    };

    const handleMouseUp = () => setDragHandle(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragHandle, safeTop, safeBottom, safeLeft, safeRight, captionBoxTop, captionBoxBottom, captionBoxLeft, captionBoxRight, speakerBoxTop, speakerBoxLeft, speakerBoxRight]);

  const handleMouseDownNested = (e: React.MouseEvent, box: "safe" | "caption" | "speaker", side: "top" | "bottom" | "left" | "right") => {
    e.preventDefault();
    setDragHandle({ box, side });
  };

  // Interpolation helper
  const interpolate = (frame: number, inputRange: number[], outputRange: number[], options?: { extrapolateLeft?: string; extrapolateRight?: string }) => {
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    
    // Extrapolate bounds check
    if (frame <= inMin) {
      if (options?.extrapolateLeft === "clamp") return outMin;
      if (options?.extrapolateLeft === "identity") return frame;
      // extend
      const progress = (frame - inMin) / (inMax - inMin);
      return outMin + progress * (outMax - outMin);
    }
    if (frame >= inMax) {
      if (options?.extrapolateRight === "clamp") return outMax;
      if (options?.extrapolateRight === "identity") return frame;
      // extend
      const progress = (frame - inMin) / (inMax - inMin);
      return outMin + progress * (outMax - outMin);
    }

    const progress = (frame - inMin) / (inMax - inMin);
    return outMin + progress * (outMax - outMin);
  };

  // Custom cubic bezier evaluator (De Casteljau algorithms)
  const getCubicBezierVal = (t: number, x1: number, y1: number, x2: number, y2: number) => {
    // Math function to calculate position on easing curves
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    const sampleCurveX = (tVal: number) => ((ax * tVal + bx) * tVal + cx) * tVal;
    
    // solve t for x using Newton Raphson
    let xVal = t;
    let tSearch = t;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(tSearch) - xVal;
      if (Math.abs(currentX) < 1e-5) break;
      const derivative = (3 * ax * tSearch + 2 * bx) * tSearch + cx;
      if (Math.abs(derivative) < 1e-5) break;
      tSearch -= currentX / derivative;
    }
    
    return ((ay * tSearch + by) * tSearch + cy) * tSearch;
  };

  const getCustomSpringVal = (frame: number, startFrame: number) => {
    const t = (frame - startFrame) / 15;
    if (t < 0) return 0;
    if (t > 1) return 1;
    
    const omega = 15 - (springStiffness / 12);
    const damp = springDamping / 2.5;
    return 1 - Math.exp(-damp * t) * Math.cos(omega * t);
  };

  // Preset load helper
  const loadPreset = (preset: typeof STYLE_PRESETS[0]) => {
    setPrimaryFont(preset.primaryFont);
    setPrimarySize(preset.primarySize);
    setPrimaryWeight(preset.primaryWeight);
    setPrimaryColorMode(preset.primaryColorMode as any);
    setPrimaryColor1(preset.primaryColor);
    setSecondaryFont(preset.secondaryFont);
    setSecondarySize(preset.secondarySize);
    setSecondaryWeight(preset.secondaryWeight);
    setSecondaryColorMode(preset.secondaryColorMode as any);
    setSecondaryColor1(preset.secondaryColor1);
    if (preset.secondaryColor2) setSecondaryColor2(preset.secondaryColor2);
    setBgType(preset.bgType as any);

    ensureFontLoaded(preset.primaryFont);
    ensureFontLoaded(preset.secondaryFont);
  };

  const copyConfigSnippet = () => {
    const configStr = `// Subtitle configurations
font_family: '${primaryFont}';
keyword_font: '${secondaryFont}';
box_margins: l:${captionBoxLeft} r:${captionBoxRight} t:${captionBoxTop} b:${captionBoxBottom};
safe_zones: l:${safeLeft} r:${safeRight} t:${safeTop} b:${safeBottom};
active_animation: '${animationType}';
spring_stiffness: ${springStiffness};\nspring_damping: ${springDamping};`;
    
    navigator.clipboard.writeText(configStr);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Get style object for visual targets
  const getStyleForTarget = (target: "primary" | "secondary"): React.CSSProperties => {
    const isP = target === "primary";
    const fontVal = isP ? primaryFont : secondaryFont;
    const sizeVal = isP ? primarySize : secondarySize;
    const weightVal = isP ? primaryWeight : secondaryWeight;
    const casingVal = isP ? primaryCasing : secondaryCasing;
    const underlineVal = isP ? primaryUnderline : secondaryUnderline;
    const letterSp = isP ? primaryLetterSpacing : secondaryLetterSpacing;
    const wordSp = isP ? primaryWordSpacing : secondaryWordSpacing;
    const lineSp = isP ? primaryLineSpacing : secondaryLineSpacing;

    const strokeE = isP ? primaryStrokeEnabled : secondaryStrokeEnabled;
    const strokeT = isP ? primaryStrokeThickness : secondaryStrokeThickness;
    const strokeC = isP ? primaryStrokeColor : secondaryStrokeColor;

    const shadowE = isP ? primaryShadowEnabled : secondaryShadowEnabled;
    const shadowOffset = isP ? { x: primaryShadowX, y: primaryShadowY, b: primaryShadowBlur, c: primaryShadowColor } 
                             : { x: secondaryShadowX, y: secondaryShadowY, b: secondaryShadowBlur, c: secondaryShadowColor };

    const colorM = isP ? primaryColorMode : secondaryColorMode;
    const col1 = isP ? primaryColor1 : secondaryColor1;
    const col2 = isP ? primaryColor2 : secondaryColor2;

    const style: React.CSSProperties = {
      fontFamily: `"${fontVal}", sans-serif`,
      fontSize: `${sizeVal}px`,
      fontWeight: weightVal,
      textTransform: casingVal,
      textDecoration: underlineVal ? "underline" : "none",
      letterSpacing: `${letterSp}px`,
      wordSpacing: `${wordSp}px`,
      lineHeight: lineSp,
      transition: "all 0.1s linear",
    };

    if (strokeE) {
      style.WebkitTextStroke = `${strokeT}px ${strokeC}`;
      style.paintOrder = "stroke fill";
    }

    if (shadowE) {
      style.textShadow = `${shadowOffset.x}px ${shadowOffset.y}px ${shadowOffset.b}px ${shadowOffset.c}`;
    }

    if (colorM === "solid") {
      style.color = col1;
    } else if (colorM === "gradient-text") {
      style.backgroundImage = `linear-gradient(135deg, ${col1}, ${col2})`;
      style.WebkitBackgroundClip = "text";
      style.WebkitTextFillColor = "transparent";
      style.backgroundClip = "text";
    }

    return style;
  };

  const getTransformedText = (raw: string, target: "primary" | "secondary") => {
    const isP = target === "primary";
    const casingVal = isP ? primaryCasing : secondaryCasing;
    if (casingVal === "uppercase") return raw.toUpperCase();
    if (casingVal === "lowercase") return raw.toLowerCase();
    if (casingVal === "capitalize") {
      return raw.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
    return raw;
  };

  // Custom animation rules directly on the preview canvas
  const getCanvasAnimatedStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      transition: "all 0.05s linear",
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center"
    };

    // Apply WebGL simulated shaders as CSS variables
    let filterString = "";
    if (blurStrength > 0) filterString += ` blur(${blurStrength}px)`;
    if (noiseStrength > 0) filterString += ` contrast(${100 + noiseStrength}%)`;
    style.filter = filterString || "none";

    // Chromatic aberration shadows
    if (chromaticAberrationStrength > 0) {
      style.textShadow = `${chromaticAberrationStrength}px 0 rgba(255,0,85,0.7), -${chromaticAberrationStrength}px 0 rgba(0,255,204,0.7)`;
    }

    // Animation Types switcher
    if (animationType === "spring-pop") {
      const scale = getCustomSpringVal(currentFrame, animDelay);
      style.transform = `scale(${scale})`;
      style.opacity = currentFrame < animDelay ? 0 : 1;
    } 
    else if (animationType === "fade-in") {
      style.opacity = interpolate(currentFrame, [animDelay, animDelay + 15, 45, 55], [0, 1, 1, 0]);
    } 
    else if (animationType === "slide-up") {
      const translateY = interpolate(currentFrame, [animDelay, animDelay + 15, 45, 55], [40, 0, 0, -40]);
      style.opacity = interpolate(currentFrame, [animDelay, animDelay + 8, 45, 55], [0, 1, 1, 0]);
      style.transform = `translateY(${translateY}px)`;
    } 
    else if (animationType === "slide-right") {
      const translateX = interpolate(currentFrame, [animDelay, animDelay + 15, 45, 55], [-60, 0, 0, 60]);
      style.opacity = interpolate(currentFrame, [animDelay, animDelay + 8, 45, 55], [0, 1, 1, 0]);
      style.transform = `translateX(${translateX}px)`;
    } 
    else if (animationType === "rotate-in") {
      const scale = getCustomSpringVal(currentFrame, animDelay);
      const rotate = currentFrame >= animDelay ? interpolate(currentFrame, [animDelay, animDelay + 15], [-15, 0]) : -15;
      style.transform = `scale(${scale}) rotate(${rotate}deg)`;
      style.opacity = currentFrame < animDelay ? 0 : 1;
    }
    else if (animationType === "scale-stretch") {
      const scaleX = getCustomSpringVal(currentFrame, animDelay);
      const scaleY = currentFrame < animDelay ? 0 : getCustomSpringVal(currentFrame, animDelay) * 0.7 + 0.3;
      style.transform = `scale(${scaleX}, ${scaleY})`;
      style.opacity = currentFrame < animDelay ? 0 : 1;
    }
    else if (animationType === "flip-3d") {
      const rotateX = interpolate(currentFrame, [animDelay, animDelay + 18, 42, 55], [90, 0, 0, -90]);
      style.transform = `perspective(400px) rotateX(${rotateX}deg)`;
      style.opacity = interpolate(currentFrame, [animDelay, animDelay + 8, 42, 55], [0, 1, 1, 0]);
    }
    else if (animationType === "blur-reveal") {
      const blurVal = interpolate(currentFrame, [animDelay, animDelay + 15, 45, 55], [12, 0, 0, 10]);
      style.opacity = interpolate(currentFrame, [animDelay, animDelay + 8, 45, 55], [0, 1, 1, 0]);
      style.filter = `blur(${blurVal}px)`;
    }
    else if (animationType === "tracking-stretch") {
      const spacing = interpolate(currentFrame, [animDelay, animDelay + 18, 45, 55], [20, 0, 0, 15]);
      style.letterSpacing = `${spacing}px`;
      style.opacity = interpolate(currentFrame, [animDelay, animDelay + 10, 45, 55], [0, 1, 1, 0]);
    }
    else if (animationType === "neon-flicker") {
      const timeline = [animDelay, animDelay + 2, animDelay + 3, animDelay + 6, animDelay + 7, animDelay + 10];
      let op = 1;
      if (currentFrame < animDelay) op = 0;
      else if (timeline.includes(currentFrame)) op = 0.15;
      style.opacity = op;
    }
    else if (animationType === "shake-glitch") {
      const glitches = [12, 13, 14, 25, 26, 38, 39];
      const isGlitching = glitches.includes(currentFrame);
      const jX = isGlitching ? (Math.random() - 0.5) * 12 : 0;
      style.transform = `translate(${jX}px, 0px)`;
    }
    else if (animationType === "bounce-entrance") {
      let y = 0;
      const start = animDelay;
      if (currentFrame >= start && currentFrame < start + 12) {
        y = interpolate(currentFrame, [start, start + 12], [-150, 0]);
      } else if (currentFrame >= start + 12 && currentFrame < start + 18) {
        y = interpolate(currentFrame, [start + 12, start + 18], [0, -30]);
      } else if (currentFrame >= start + 18 && currentFrame < start + 24) {
        y = interpolate(currentFrame, [start + 18, start + 24], [-30, 0]);
      }
      style.transform = `translateY(${y}px)`;
      style.opacity = currentFrame < start ? 0 : 1;
    }

    return style;
  };

  // Parser
  const parsePreviewText = (rawStr: string) => {
    const regex = /\[([^\]]+)\]/g;
    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawStr)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          text: rawStr.substring(lastIndex, match.index),
          type: "primary" as const
        });
      }
      tokens.push({
        text: match[1],
        type: "secondary" as const
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < rawStr.length) {
      tokens.push({
        text: rawStr.substring(lastIndex),
        type: "primary" as const
      });
    }

    if (tokens.length === 0) {
      tokens.push({ text: rawStr, type: "primary" as const });
    }

    return tokens;
  };

  const getFilteredFontsList = () => {
    const list = FONT_CATEGORIES[activeCategory];
    if (!fontSearch) return list;
    return list.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));
  };

  // Mock social template overlay guides
  const renderMockSocialGrid = () => {
    if (showGridOverlay === "none") return null;

    if (showGridOverlay === "tiktok") {
      return (
        <div className="absolute inset-0 z-20 pointer-events-none text-left flex flex-col justify-between p-4 font-sans text-xs">
          <div className="flex justify-between items-center text-white/50 bg-black/25 p-1 px-3 rounded-full backdrop-blur-sm mx-auto">
            <span>Following • <b>For You</b></span>
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-1.5 max-w-[200px] text-white/90 select-none pb-4">
              <p className="font-bold">@captions.easy</p>
              <p className="text-[9px] leading-relaxed">Nesting caption bounding boxes inside social layouts ensures overlays don't clip.</p>
              <div className="text-[8px] bg-white/10 px-2 py-0.5 rounded-full w-max text-[#FFB800]">
                🎵 Original Sound - motionai
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 text-white/90 select-none pr-1 mb-8">
              <div className="w-8 h-8 rounded-full bg-[#00F5C4] border border-white/20 flex items-center justify-center font-bold text-black text-[10px]">C</div>
              <div className="flex flex-col items-center"><span className="text-sm">❤️</span><span className="text-[8px] font-bold">128K</span></div>
              <div className="flex flex-col items-center"><span className="text-sm">💬</span><span className="text-[8px] font-bold">4.2K</span></div>
            </div>
          </div>
        </div>
      );
    }

    if (showGridOverlay === "reels") {
      return (
        <div className="absolute inset-0 z-20 pointer-events-none text-left flex flex-col justify-between p-4 font-sans text-xs">
          <div className="flex justify-between items-center text-white/80 font-bold">
            <span>Reels</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-1 max-w-[220px] text-white/90 select-none pb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[8px]">RE</div>
                <span className="font-bold text-[10px]">reels.maker</span>
              </div>
              <p className="text-[9px]">Testing safe area overlaps with Instagram button templates.</p>
            </div>
            <div className="flex flex-col items-center gap-4 text-white/90 select-none pr-1 pb-4">
              <span>❤️ 24K</span>
              <span>💬 512</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCanvasText = () => {
    if (activeTestType === "karaoke") {
      const words = text.split(" ");
      const activeWordIndex = isPlaying 
        ? Math.floor(interpolate(currentFrame, [animDelay, totalFrames - 10], [0, words.length])) 
        : 0;

      return (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center select-none w-full max-w-full">
          {words.map((w, idx) => {
            const isActive = idx === activeWordIndex;
            const style = getStyleForTarget(isActive ? "secondary" : "primary");
            return (
              <span key={idx} style={style} className={`inline-block transition-transform duration-75 select-none ${isActive ? "scale-110 shadow-lg text-[#FFB800]" : ""}`}>
                {w}
              </span>
            );
          })}
        </div>
      );
    }

    if (activeTestType === "dual-track") {
      return (
        <div className="flex flex-col items-center gap-2 select-none w-full max-w-full">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {parsePreviewText("Exploring [CREATIVE] subtitles.").map((token, idx) => (
              <span key={idx} style={getStyleForTarget(token.type)} className="inline-block whitespace-normal select-none font-bold">
                {getTransformedText(token.text, token.type)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 opacity-80 border-t border-white/10 pt-1.5 w-full">
            <span style={getStyleForTarget("secondary")} className="text-[10px] tracking-wider uppercase font-black">
              EXPLORANDO SUBTITULOS CREATIVOS
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 max-w-full text-center">
        {parsePreviewText(text).map((token, idx) => (
          <span key={idx} style={getStyleForTarget(token.type)} className="inline-block whitespace-normal select-none">
            {getTransformedText(token.text, token.type)}
          </span>
        ))}
      </div>
    );
  };

  // Remotion Animation code generator mapping
  const getAnimationCodeSnippet = () => {
    const list: Record<string, string> = {
      "spring-pop": `// Spring Pop entrance logic (scale rebound bounce)
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const scale = spring({
  frame: frame - ${animDelay},
  fps,
  config: { damping: ${springDamping}, stiffness: ${springStiffness}, mass: ${springMass} }
});

return <div style={{ transform: \`scale(\${scale})\` }}>Bounce Entrance</div>;`,

      "fade-in": `// Smooth linear opacity crossfade keyframes
import { interpolate, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();
const opacity = interpolate(frame, [${animDelay}, ${animDelay + 15}], [0, 1], {
  extrapolateRight: "clamp"
});

return <div style={{ opacity }}>Crossfading</div>;`,

      "slide-up": `// Vertical slide reveal with cubic easing
import { interpolate, useCurrentFrame, Easing } from "remotion";

const frame = useCurrentFrame();
const translateY = interpolate(frame, [${animDelay}, ${animDelay + 15}], [40, 0], {
  easing: Easing.bezier(${bezierX1}, ${bezierY1}, ${bezierX2}, ${bezierY2}),
  extrapolateLeft: "${extrapolateLeft}",
  extrapolateRight: "${extrapolateRight}"
});

return <div style={{ transform: \`translateY(\${translateY}px)\` }}>Slide Up</div>;`,

      "slide-right": `// Horizontal slide sweep transition
import { interpolate, useCurrentFrame, Easing } from "remotion";

const frame = useCurrentFrame();
const translateX = interpolate(frame, [${animDelay}, ${animDelay + 15}], [-60, 0], {
  easing: Easing.out(Easing.cubic)
});

return <div style={{ transform: \`translateX(\${translateX}px)\` }}>Horizontal Slide</div>;`,

      "rotate-in": `// Rotation Spin pop entry
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const scale = spring({ frame: frame - ${animDelay}, fps, config: { damping: ${springDamping} } });
const rotate = interpolate(frame, [${animDelay}, ${animDelay + 15}], [-15, 0], { extrapolateRight: "clamp" });

return <div style={{ transform: \`scale(\${scale}) rotate(\${rotate}deg)\` }}>Rotational Entrance</div>;`
    };

    return list[animationType] || list["spring-pop"];
  };

  // Render CLI output command string
  const getRenderCliCommand = () => {
    return `npx remotion render src/index.ts Main public/output.${cliFormat} \\
  --codec=${cliCodec} \\
  --scale=${cliScale} \\
  --quality=${cliQuality} \\
  --props='{"fps":${fps},"text":"${text}"}'`;
  };

  return (
    <div className="min-h-screen bg-[#07080A] text-white select-none pb-12 antialiased">
      
      {/* Searchable custom dropdown modal */}
      {fontPickerTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div ref={fontPickerRef} className="w-full max-w-lg bg-[#111317] border border-[#23272F] rounded-xl flex flex-col h-[500px] shadow-2xl overflow-hidden text-left">
            <div className="bg-[#0E1013] border-b border-[#23272F] p-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-primary font-black uppercase text-[#FFB800] tracking-wider flex items-center gap-1.5">Pick {fontPickerTarget} Font</h3>
                <p className="text-[8px] uppercase tracking-widest text-white/40">Select from 130+ Google Webfonts</p>
              </div>
              <button onClick={() => setFontPickerTarget(null)} className="px-2.5 py-1 text-[8px] bg-white/5 border border-white/10 hover:border-white/20 uppercase tracking-widest font-black rounded cursor-pointer text-white">Close</button>
            </div>
            <div className="p-3 border-b border-[#23272F]/50 flex gap-2 items-center bg-[#181B21]/40">
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input type="text" placeholder="Search typography by name..." value={fontSearch} onChange={(e) => setFontSearch(e.target.value)} className="w-full bg-transparent border-0 text-xs focus:outline-none placeholder-white/20 text-white" />
            </div>
            <div className="flex border-b border-[#23272F]/60 bg-[#0E1013]/30 p-1 flex-wrap gap-0.5 shrink-0">
              {Object.keys(FONT_CATEGORIES).map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat as any)} className={`px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider rounded cursor-pointer transition-all ${activeCategory === cat ? "bg-[#FFB800] text-[#0A0B0D]" : "text-white/40 hover:text-white/80"}`}>{cat.split(" / ")[0]}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin bg-[#0A0B0D]/30">
              {getFilteredFontsList().map((f) => {
                const isSelected = fontPickerTarget === "primary" ? primaryFont === f : fontPickerTarget === "secondary" ? secondaryFont === f : speakerFont === f;
                return (
                  <button key={f} onClick={() => {
                    if (fontPickerTarget === "primary") setPrimaryFont(f);
                    else if (fontPickerTarget === "secondary") setSecondaryFont(f);
                    else setSpeakerFont(f);
                    setFontPickerTarget(null);
                    setFontSearch("");
                  }} className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer group ${isSelected ? "bg-[#FFB800]/10 border-[#FFB800] text-white" : "bg-[#181B21]/40 border-[#23272F] hover:border-white/20 text-white/60 hover:text-white"}`}>
                    <div className="flex flex-col text-left">
                      <span style={{ fontFamily: `"${f}", sans-serif` }} className="text-sm font-bold tracking-wide">{f}</span>
                      <span className="text-[7.5px] uppercase font-bold tracking-widest text-white/20 group-hover:text-white/40 mt-0.5">{getFontCategoryTag(f)} • 400-900 weights</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#FFB800] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legacy notice: this page is CSS-simulated (no real Remotion). Kept
          intact while its features are ported one-by-one into the real,
          Remotion-Player-backed pages under /test. Nothing below is deleted. */}
      <div className="bg-[#3A2A00] border-b border-[#FFB800]/40 px-6 py-2 text-[10px] text-[#FFDF8C] flex items-center justify-between">
        <span>Legacy CSS-simulated explorer — superseded by the real-Remotion pages at <Link href="/test" className="underline font-bold">/test</Link>. Kept for reference until every feature here is ported.</span>
        <Link href="/test" className="shrink-0 ml-4 px-2 py-0.5 border border-[#FFB800]/50 rounded hover:bg-[#FFB800]/10 font-bold uppercase tracking-wider">Go to new hub</Link>
      </div>

      {/* Header */}
      <header className="border-b border-[#23272F]/80 bg-[#0E1013]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 rounded-full bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] hover:text-[#FFB800] transition-colors cursor-pointer text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-left">
            <h1 className="text-sm font-primary font-black uppercase tracking-wider text-white flex items-center gap-2">Remotion Visual Reference Explorer <span className="text-[7.5px] bg-[#00F5C4]/15 text-[#00F5C4] border border-[#00F5C4]/20 px-2 py-0.5 rounded-full">v2.1 (legacy)</span></h1>
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Interactive UI conversion of Remotion documentation guidelines</p>
          </div>
        </div>
        <div>
          <Link href="/dashboard" className="px-4 py-2 border border-[#23272F] rounded text-[10px] font-black uppercase tracking-wider hover:bg-white/5 cursor-pointer text-[#FFB800] hover:border-[#FFB800] transition-all">Back to App</Link>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CANVAS & SCRUBBERS (5/12 cols) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#111317] border border-[#23272F] rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Delay Render Loading overlay simulation */}
            {isDelayActive && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-[80] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <Loader2 className="w-10 h-10 text-[#FFB800] animate-spin mb-4" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">delayRender() active</h4>
                <p className="text-[9px] text-white/40 max-w-[200px] mt-1.5 uppercase leading-relaxed font-mono">
                  Engine is blocked. Waiting for resource download... ({delayCountdown}s left)
                </p>
                <div className="bg-[#181B21] border border-white/5 rounded p-2 text-[8px] font-mono text-left text-white/60 mt-4 leading-normal">
                  const handle = delayRender();<br />
                  // asset fetched...<br />
                  continueRender(handle);
                </div>
              </div>
            )}

            <div className="bg-[#0E1013] border-b border-[#23272F] px-4 py-3 flex justify-between items-center">
              <span className="text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Eye className="w-3.5 h-3.5 text-[#00F5C4]" /> Live visual canvas
              </span>
              <div className="flex items-center gap-1">
                {(["9:16", "16:9", "1:1"] as const).map(r => (
                  <button key={r} onClick={() => setActiveRatio(r)} className={`px-2 py-0.5 rounded text-[8px] border transition-colors cursor-pointer ${activeRatio === r ? "bg-[#FFB800] text-black border-[#FFB800] font-black" : "bg-white/5 border-white/10 text-white/60"}`}>{r}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 border-b border-[#23272F] p-1 bg-[#181B21]/20">
              {[
                { id: "standard", label: "Standard" },
                { id: "speaker-badge", label: "Speaker" },
                { id: "dual-track", label: "Dual Track" },
                { id: "karaoke", label: "Karaoke" }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTestType(t.id as any)} className={`py-1 text-[8px] font-black uppercase rounded cursor-pointer transition-all ${activeTestType === t.id ? "bg-[#FFB800] text-[#0A0B0D]" : "text-white/60 hover:text-white"}`}>{t.label}</button>
              ))}
            </div>

            <div className="px-3 py-1.5 border-b border-[#23272F] bg-[#181B21]/10 flex items-center gap-2">
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1"><Grid className="w-3 h-3" /> Overlays:</span>
              <div className="flex gap-1.5">
                {(["none", "tiktok", "reels"] as const).map((overlay) => (
                  <button key={overlay} onClick={() => setShowGridOverlay(overlay)} className={`px-2 py-0.5 rounded text-[7.5px] uppercase font-black cursor-pointer border ${showGridOverlay === overlay ? "bg-[#00F5C4] text-[#0A0B0D] border-[#00F5C4]" : "bg-white/5 border-white/10 text-white/60"}`}>{overlay}</button>
                ))}
              </div>
              <div className="flex-1 text-right">
                <button onClick={() => setBoxEditMode(!boxEditMode)} className={`px-2 py-0.5 rounded text-[7.5px] uppercase font-black cursor-pointer border ${boxEditMode ? "bg-[#FFB800] text-[#0A0B0D] border-[#FFB800]" : "bg-white/5 border-white/10 text-white/60"}`}>{boxEditMode ? "Hide Boxes" : "Show Boxes"}</button>
              </div>
            </div>

            {/* Preview Frame */}
            <div ref={canvasRef} className="w-full bg-[#050608] relative flex items-center justify-center p-0 border-b border-[#23272F] overflow-hidden select-none" style={{ height: activeRatio === "9:16" ? "480px" : activeRatio === "16:9" ? "250px" : "320px" }}>
              <div className="absolute inset-0 bg-[radial-gradient(#23272F_1.2px,transparent_1.2px)] bg-[size:16px_16px] opacity-45 pointer-events-none" />
              {renderMockSocialGrid()}

              {/* Vignette Overlay filter */}
              {vignetteStrength > 0 && (
                <div className="absolute inset-0 pointer-events-none z-[19]" style={{ backgroundImage: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${vignetteStrength / 100}) 100%)` }} />
              )}

              {/* Bounding safe zones (parent) */}
              {boxEditMode && (
                <div className="absolute border border-dashed border-[#FFB800]/50 pointer-events-none rounded transition-all" style={{ top: `${safeTop}px`, bottom: `${safeBottom}px`, left: `${safeLeft}px`, right: `${safeRight}px` }}>
                  <div onMouseDown={(e) => handleMouseDownNested(e, "safe", "top")} className="absolute -top-1 left-1/4 w-4 h-2 bg-[#FFB800] border border-[#0A0B0D] rounded-full cursor-ns-resize pointer-events-auto shadow-md" />
                  <div onMouseDown={(e) => handleMouseDownNested(e, "safe", "bottom")} className="absolute -bottom-1 left-1/4 w-4 h-2 bg-[#FFB800] border border-[#0A0B0D] rounded-full cursor-ns-resize pointer-events-auto shadow-md" />
                  <div onMouseDown={(e) => handleMouseDownNested(e, "safe", "left")} className="absolute -left-1 top-1/4 w-2 h-4 bg-[#FFB800] border border-[#0A0B0D] rounded-full cursor-ew-resize pointer-events-auto shadow-md" />
                  <div onMouseDown={(e) => handleMouseDownNested(e, "safe", "right")} className="absolute -right-1 top-1/4 w-2 h-4 bg-[#FFB800] border border-[#0A0B0D] rounded-full cursor-ew-resize pointer-events-auto shadow-md" />
                </div>
              )}

              {/* Speaker box (child) */}
              {activeTestType === "speaker-badge" && (
                <div className="absolute select-none flex items-center justify-center p-1 px-3 transition-all text-center z-10" style={{ top: `${speakerBoxTop}px`, left: `${speakerBoxLeft}px`, right: `${speakerBoxRight}px`, backgroundColor: speakerBgColor, borderRadius: "4px" }}>
                  {boxEditMode && (
                    <>
                      <div onMouseDown={(e) => handleMouseDownNested(e, "speaker", "top")} className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-[#00F5C4] border border-[#0A0B0D] rounded-full cursor-ns-resize pointer-events-auto shadow-md" />
                      <div onMouseDown={(e) => handleMouseDownNested(e, "speaker", "left")} className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-3 bg-[#00F5C4] border border-[#0A0B0D] rounded-full cursor-ew-resize pointer-events-auto shadow-md" />
                      <div onMouseDown={(e) => handleMouseDownNested(e, "speaker", "right")} className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-3 bg-[#00F5C4] border border-[#0A0B0D] rounded-full cursor-ew-resize pointer-events-auto shadow-md" />
                    </>
                  )}
                  <span style={{ fontFamily: `"${speakerFont}", monospace`, fontSize: `${speakerSize}px`, fontWeight: speakerWeight, color: speakerColor }} className="uppercase">{speakerText}</span>
                </div>
              )}

              {/* Caption content container */}
              <div className="absolute flex flex-wrap justify-center items-center select-none" style={{ top: `${captionBoxTop}px`, bottom: `${captionBoxBottom}px`, left: `${captionBoxLeft}px`, right: `${captionBoxRight}px`, padding: bgType !== "none" ? `${bgPaddingY}px ${bgPaddingX}px` : "0px", backgroundColor: bgType !== "none" ? bgColor : "transparent", borderRadius: bgType === "pill" ? "9999px" : bgType === "shadow-box" ? "8px" : "0px", zIndex: 5 }}>
                {boxEditMode && (
                  <div className="absolute inset-0 border border-dashed border-[#00F5C4]/40 pointer-events-none rounded">
                    <div onMouseDown={(e) => handleMouseDownNested(e, "caption", "top")} className="absolute -top-1 left-2/3 w-3 h-2 bg-[#00F5C4] border border-[#0A0B0D] rounded-full cursor-ns-resize pointer-events-auto shadow-md" />
                    <div onMouseDown={(e) => handleMouseDownNested(e, "caption", "bottom")} className="absolute -bottom-1 left-2/3 w-3 h-2 bg-[#00F5C4] border border-[#0A0B0D] rounded-full cursor-ns-resize pointer-events-auto shadow-md" />
                    <div onMouseDown={(e) => handleMouseDownNested(e, "caption", "left")} className="absolute -left-1 top-2/3 w-2 h-3 bg-[#00F5C4] border border-[#0A0B0D] rounded-full cursor-ew-resize pointer-events-auto shadow-md" />
                    <div onMouseDown={(e) => handleMouseDownNested(e, "caption", "right")} className="absolute -right-1 top-2/3 w-2 h-3 bg-[#00F5C4] border border-[#0A0B0D] rounded-full cursor-ew-resize pointer-events-auto shadow-md" />
                  </div>
                )}
                <div style={getCanvasAnimatedStyle()} className="w-full max-w-full">
                  {renderCanvasText()}
                </div>
              </div>
            </div>

            {/* Playback scrubbing controls */}
            <div className="bg-[#0E1013] border-b border-[#23272F] p-3.5 space-y-1.5 text-left relative z-10">
              <div className="flex justify-between items-center text-[7.5px] font-mono text-white/50 uppercase">
                <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5 text-[#FFB800]" /> playhead frame: {currentFrame} / {totalFrames}</span>
                <span>duration: 2.0s • {fps} FPS</span>
              </div>
              <div className="flex gap-3 items-center">
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-lg bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] text-white cursor-pointer transition-colors shadow-sm">
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setCurrentFrame(0)} className="p-2 rounded-lg bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] text-white cursor-pointer transition-colors shadow-sm">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <input type="range" min="0" max={totalFrames} value={currentFrame} onChange={(e) => { setIsPlaying(false); setCurrentFrame(parseInt(e.target.value)); }} className="flex-1 h-1 bg-[#181B21] rounded-lg appearance-none cursor-pointer accent-[#FFB800]" />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: DOCUMENTATION ACTION TABS (7/12 cols) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Main Navigation tabs */}
          <div className="flex border border-[#23272F] bg-[#111317] rounded-xl p-1 shrink-0 overflow-x-auto gap-0.5 font-sans">
            {[
              { id: "typography", label: "Typography & Presets", icon: Type },
              { id: "timing", label: "Timing & Bézier", icon: Sliders },
              { id: "sequencing", label: "Sequences Track", icon: Film },
              { id: "effects", label: "Visual Shaders", icon: Sparkles },
              { id: "audio", label: "Audio & Waveform", icon: Volume2 },
              { id: "cli", label: "CLI command Builder", icon: Terminal },
              { id: "hooks", label: "Engine Hooks API", icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setExplorerTab(tab.id as any)}
                  className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    explorerTab === tab.id ? "bg-[#FFB800] text-[#0A0B0D]" : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label.split(" & ")[0]}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT CARDS */}
          <div className="bg-[#111317]/90 border border-[#23272F] rounded-xl p-6 text-left shadow-lg">
            
            {/* 1. TYPOGRAPHY & PRESETS EXPLORER */}
            {explorerTab === "typography" && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="border-b border-[#23272F] pb-3">
                  <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">Typography & Preset Templates</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#00F5C4] font-semibold mt-0.5">Select and test layouts, styling fonts, and backgrounds</p>
                </div>

                {/* Preset selectors */}
                <div className="space-y-2">
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50">Load Presets</label>
                  <div className="grid grid-cols-2 gap-3">
                    {STYLE_PRESETS.map(p => (
                      <button key={p.id} onClick={() => loadPreset(p)} className="p-3 bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] rounded-xl text-left cursor-pointer transition-all hover:scale-[1.01]">
                        <span className="block text-[10px] font-bold text-white uppercase">{p.name}</span>
                        <span className="block text-[8px] text-white/40 uppercase mt-0.5">{p.primaryFont} + {p.secondaryFont}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom typography edits targets */}
                <div className="flex border border-[#23272F] bg-[#0A0B0D] rounded p-0.5 w-max">
                  {(["primary", "secondary", "speaker"] as const).map(target => (
                    <button key={target} onClick={() => setEditTarget(target)} className={`px-4 py-1 text-[8.5px] font-black uppercase cursor-pointer rounded transition-all ${editTarget === target ? "bg-[#FFB800] text-[#0A0B0D]" : "text-white/60 hover:text-white"}`}>{target}</button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50">Sandbox Preview String</label>
                  <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-[#181B21] border border-[#23272F] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#FFB800]" />
                </div>

                {/* Layout sizing sliders */}
                {editTarget !== "speaker" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50">Font Family</label>
                      <button onClick={() => setFontPickerTarget(editTarget)} className="w-full flex items-center justify-between bg-[#181B21] border border-[#23272F] rounded-lg px-3 py-2 text-xs focus:outline-none hover:border-[#FFB800] text-white font-bold cursor-pointer">
                        <span style={{ fontFamily: `"${editTarget === "primary" ? primaryFont : secondaryFont}"` }}>{editTarget === "primary" ? primaryFont : secondaryFont}</span>
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[8px] font-bold uppercase tracking-wider text-white/50">Font Size</label>
                        <span className="text-[8px] font-mono text-[#00F5C4]">{editTarget === "primary" ? primarySize : secondarySize}px</span>
                      </div>
                      <input type="range" min="12" max="60" value={editTarget === "primary" ? primarySize : secondarySize} onChange={(e) => editTarget === "primary" ? setPrimarySize(parseInt(e.target.value)) : setSecondarySize(parseInt(e.target.value))} className="w-full h-1 bg-[#181B21] rounded-lg appearance-none cursor-pointer accent-[#00F5C4]" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50">Speaker Name text</label>
                      <input type="text" value={speakerText} onChange={(e) => setSpeakerText(e.target.value)} className="w-full bg-[#181B21] border border-[#23272F] rounded-lg p-2 text-xs text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50">Font Family</label>
                      <button onClick={() => setFontPickerTarget("speaker")} className="w-full flex items-center justify-between bg-[#181B21] border border-[#23272F] rounded-lg px-3 py-2 text-xs text-white font-bold cursor-pointer">
                        <span>{speakerFont}</span>
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Stroke and drop shadow togglers */}
                {editTarget !== "speaker" && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#23272F]/50">
                    <div className="space-y-2 p-3 bg-[#181B21]/30 border border-[#23272F] rounded-xl">
                      <div className="flex justify-between items-center border-b border-[#23272F] pb-2">
                        <span className="text-[8.5px] font-bold uppercase text-white">Stroke Outline</span>
                        <button onClick={() => editTarget === "primary" ? setPrimaryStrokeEnabled(!primaryStrokeEnabled) : setSecondaryStrokeEnabled(!secondaryStrokeEnabled)} className={`w-8 h-4.5 rounded-full p-0.5 cursor-pointer transition-colors ${ (editTarget === "primary" ? primaryStrokeEnabled : secondaryStrokeEnabled) ? "bg-[#00F5C4]" : "bg-[#23272F]" }`}><div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${ (editTarget === "primary" ? primaryStrokeEnabled : secondaryStrokeEnabled) ? "translate-x-3.5" : "translate-x-0" }`} /></button>
                      </div>
                      {(editTarget === "primary" ? primaryStrokeEnabled : secondaryStrokeEnabled) && (
                        <div className="space-y-2 pt-2">
                          <input type="range" min="1" max="6" step="0.5" value={editTarget === "primary" ? primaryStrokeThickness : secondaryStrokeThickness} onChange={(e) => editTarget === "primary" ? setPrimaryStrokeThickness(parseFloat(e.target.value)) : setSecondaryStrokeThickness(parseFloat(e.target.value))} className="w-full h-1 bg-[#181B21] rounded-lg appearance-none accent-[#00F5C4]" />
                          <input type="color" value={editTarget === "primary" ? primaryStrokeColor : secondaryStrokeColor} onChange={(e) => editTarget === "primary" ? setPrimaryStrokeColor(e.target.value) : setSecondaryStrokeColor(e.target.value)} className="w-full h-8 bg-transparent border-0 cursor-pointer" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-3 bg-[#181B21]/30 border border-[#23272F] rounded-xl">
                      <div className="flex justify-between items-center border-b border-[#23272F] pb-2">
                        <span className="text-[8.5px] font-bold uppercase text-white font-sans">Drop Shadow</span>
                        <button onClick={() => editTarget === "primary" ? setPrimaryShadowEnabled(!primaryShadowEnabled) : setSecondaryShadowEnabled(!secondaryShadowEnabled)} className={`w-8 h-4.5 rounded-full p-0.5 cursor-pointer transition-colors ${ (editTarget === "primary" ? primaryShadowEnabled : secondaryShadowEnabled) ? "bg-[#00F5C4]" : "bg-[#23272F]" }`}><div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${ (editTarget === "primary" ? primaryShadowEnabled : secondaryShadowEnabled) ? "translate-x-3.5" : "translate-x-0" }`} /></button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 2. TIMING & INTERPOLATION EXPLORER */}
            {explorerTab === "timing" && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="border-b border-[#23272F] pb-3">
                  <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">Remotion Interpolation & Easing Curves</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#00F5C4] font-semibold mt-0.5">Visualize interpolate() mapping values live on a dynamic Bezier graph</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* SVG Math Graph Grid plotting cubic bezier */}
                  <div className="bg-[#050608] border border-[#23272F] rounded-xl p-4 flex flex-col items-center justify-center relative">
                    <svg className="w-48 h-48 border border-white/5 bg-[#0E1013]/30 overflow-visible" viewBox="0 0 150 150">
                      {/* Grid Lines */}
                      <line x1="0" y1="37.5" x2="150" y2="37.5" stroke="rgba(255,255,255,0.05)" />
                      <line x1="0" y1="75" x2="150" y2="75" stroke="rgba(255,255,255,0.05)" />
                      <line x1="0" y1="112.5" x2="150" y2="112.5" stroke="rgba(255,255,255,0.05)" />
                      <line x1="37.5" y1="0" x2="37.5" y2="150" stroke="rgba(255,255,255,0.05)" />
                      <line x1="75" y1="0" x2="75" y2="150" stroke="rgba(255,255,255,0.05)" />
                      <line x1="112.5" y1="0" x2="112.5" y2="150" stroke="rgba(255,255,255,0.05)" />

                      {/* Easing Bezier Curve Line */}
                      <path 
                        d={`M 0 150 C ${bezierX1 * 150} ${150 - bezierY1 * 150}, ${bezierX2 * 150} ${150 - bezierY2 * 150}, 150 0`} 
                        fill="none" 
                        stroke="#00F5C4" 
                        strokeWidth="3.5" 
                      />

                      {/* Control handles lines */}
                      <line x1="0" y1="150" x2={bezierX1 * 150} y2={150 - bezierY1 * 150} stroke="rgba(255,184,0,0.5)" strokeWidth="1" strokeDasharray="2,2" />
                      <line x1="150" y1="0" x2={bezierX2 * 150} y2={150 - bezierY2 * 150} stroke="rgba(255,184,0,0.5)" strokeWidth="1" strokeDasharray="2,2" />

                      {/* Control points */}
                      <circle cx={bezierX1 * 150} cy={150 - bezierY1 * 150} r="4" fill="#FFB800" />
                      <circle cx={bezierX2 * 150} cy={150 - bezierY2 * 150} r="4" fill="#FFB800" />

                      {/* Current progress dot indicator */}
                      {(() => {
                        const t = currentFrame / totalFrames;
                        const bx = (1-t)**3 * 0 + 3*(1-t)**2 * t * (bezierX1*150) + 3*(1-t)*t**2 * (bezierX2*150) + t**3 * 150;
                        const by = (1-t)**3 * 150 + 3*(1-t)**2 * t * (150 - bezierY1*150) + 3*(1-t)*t**2 * (150 - bezierY2*150) + t**3 * 0;
                        return <circle cx={bx} cy={by} r="5" fill="#FF3B30" className="animate-pulse" />;
                      })()}
                    </svg>
                    <span className="text-[7.5px] font-mono text-white/40 uppercase mt-3">cubic-bezier({bezierX1.toFixed(2)}, {bezierY1.toFixed(2)}, {bezierX2.toFixed(2)}, {bezierY2.toFixed(2)})</span>
                  </div>

                  {/* Bezier configuration sliders */}
                  <div className="space-y-4 font-sans text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/50 block">Bezier Handles Coordinates</span>
                    
                    <div className="space-y-2 font-sans">
                      <div className="flex justify-between items-center text-[8px] font-mono text-white/60">
                        <span>Control Point X1</span>
                        <span>{bezierX1.toFixed(2)}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" value={bezierX1} onChange={(e) => setBezierX1(parseFloat(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#FFB800]" />
                    </div>

                    <div className="space-y-2 font-sans">
                      <div className="flex justify-between items-center text-[8px] font-mono text-white/60">
                        <span>Control Point Y1 (Overshoot)</span>
                        <span>{bezierY1.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-0.5" max="2" step="0.01" value={bezierY1} onChange={(e) => setBezierY1(parseFloat(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#FFB800]" />
                    </div>

                    <div className="space-y-2 font-sans">
                      <div className="flex justify-between items-center text-[8px] font-mono text-white/60">
                        <span>Control Point X2</span>
                        <span>{bezierX2.toFixed(2)}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" value={bezierX2} onChange={(e) => setBezierX2(parseFloat(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#FFB800]" />
                    </div>

                    <div className="space-y-2 font-sans">
                      <div className="flex justify-between items-center text-[8px] font-mono text-white/60">
                        <span>Control Point Y2</span>
                        <span>{bezierY2.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-0.5" max="2" step="0.01" value={bezierY2} onChange={(e) => setBezierY2(parseFloat(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#FFB800]" />
                    </div>
                  </div>

                </div>

                {/* Easing presets mapping buttons */}
                <div className="space-y-2 pt-4 border-t border-[#23272F]/50">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 block">Load Standard Easing Curves</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { name: "UI Entrance", x1: 0.16, y1: 1.0, x2: 0.3, y2: 1.0 },
                      { name: "Editorial Ease", x1: 0.45, y1: 0.0, x2: 0.55, y2: 1.0 },
                      { name: "Overshoot Pop", x1: 0.34, y1: 1.56, x2: 0.64, y2: 1.0 },
                      { name: "Linear Constant", x1: 0.0, y1: 0.0, x2: 1.0, y2: 1.0 }
                    ].map(p => (
                      <button 
                        key={p.name} 
                        onClick={() => { setBezierX1(p.x1); setBezierY1(p.y1); setBezierX2(p.x2); setBezierY2(p.y2); }} 
                        className="px-2.5 py-1.5 bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] rounded text-[8.5px] uppercase font-black text-center cursor-pointer transition-all"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interpolation extrapolate parameters settings */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#23272F]/50">
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50 font-sans">extrapolateLeft</label>
                    <div className="relative font-sans">
                      <select value={extrapolateLeft} onChange={(e) => setExtrapolateLeft(e.target.value as any)} className="w-full bg-[#181B21] border border-[#23272F] rounded-lg p-2 text-xs focus:outline-none text-white appearance-none cursor-pointer">
                        <option value="clamp">clamp (freeze bounds)</option>
                        <option value="extend">extend (continue slope)</option>
                        <option value="identity">identity (returns frame value)</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50 font-sans">extrapolateRight</label>
                    <div className="relative font-sans">
                      <select value={extrapolateRight} onChange={(e) => setExtrapolateRight(e.target.value as any)} className="w-full bg-[#181B21] border border-[#23272F] rounded-lg p-2 text-xs focus:outline-none text-white appearance-none cursor-pointer">
                        <option value="clamp">clamp (freeze bounds)</option>
                        <option value="extend">extend (continue slope)</option>
                        <option value="identity">identity (returns frame value)</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 3. SEQUENCES TIMELINE EXPLORER */}
            {explorerTab === "sequencing" && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="border-b border-[#23272F] pb-3">
                  <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">Composition Sequences & Overlap Tracks</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#FFB800] font-semibold mt-0.5">Visual representation of Sequence and TransitionSeries tracks</p>
                </div>

                <div className="bg-[#050608] border border-[#23272F] rounded-xl p-4 space-y-3 relative overflow-hidden">
                  
                  {/* Track 1: Background sequence */}
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[8px] font-mono text-white/50 uppercase select-none">1. Background</span>
                    <div className="flex-1 bg-white/5 h-6 rounded border border-white/5 relative">
                      <div className="absolute inset-0 bg-[#00F5C4]/15 rounded border-l-2 border-[#00F5C4]" style={{ left: "0%", right: "0%" }} />
                      <span className="absolute left-2 top-1 text-[7.5px] font-mono uppercase text-white/80">from=0 duration=60</span>
                    </div>
                  </div>

                  {/* Track 2: Title Sequence */}
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[8px] font-mono text-white/50 uppercase select-none">2. Main Title</span>
                    <div className="flex-1 bg-white/5 h-6 rounded border border-white/5 relative">
                      <div className="absolute top-0 bottom-0 bg-[#FFB800]/15 rounded border-l-2 border-[#FFB800]" style={{ left: "16.6%", right: "25%" }} />
                      <span className="absolute left-[20%] top-1 text-[7.5px] font-mono uppercase text-white/80">from=10 duration=35</span>
                    </div>
                  </div>

                  {/* Track 3: Subtitles track */}
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[8px] font-mono text-white/50 uppercase select-none">3. Subtitles</span>
                    <div className="flex-1 bg-white/5 h-6 rounded border border-white/5 relative">
                      <div className="absolute top-0 bottom-0 bg-purple-500/15 rounded border-l-2 border-purple-500" style={{ left: "33.3%", right: "10%" }} />
                      <span className="absolute left-[36%] top-1 text-[7.5px] font-mono uppercase text-white/80">from=20 duration=34</span>
                    </div>
                  </div>

                  {/* Red scrubber playhead ruler line */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10" style={{ left: `calc(${currentFrame / totalFrames * 100}% + 80px - 10px)` }} />
                </div>

                <div className="bg-[#181B21]/30 p-3 rounded-lg border border-[#23272F]/50 text-[10px] text-white/60 space-y-1.5 font-sans leading-relaxed">
                  <p className="font-bold text-white uppercase text-[8px] tracking-wider text-left flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-[#00F5C4]" /> Sequence Track Rules</p>
                  <p>In Remotion, nested child tracks are delayed and cropped dynamically via the <code className="font-mono text-white/80">&lt;Sequence&gt;</code> element. This allows scene structures to stay modular and local playhead frame metrics to stay localized.</p>
                </div>
              </div>
            )}

            {/* 4. VISUAL EFFECT SHADERS */}
            {explorerTab === "effects" && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="border-b border-[#23272F] pb-3">
                  <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">WebGL visual Effects & Green Screen Keyer</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#00F5C4] font-semibold mt-0.5">Toggle and apply visual transformations on the preview canvas</p>
                </div>

                <div className="space-y-4">
                  {/* Slider for Blur */}
                  <div className="space-y-1 font-sans">
                    <div className="flex justify-between items-center text-[8.5px] font-bold uppercase text-white/60">
                      <span>Blur filter radius (blur())</span>
                      <span className="font-mono text-[#00F5C4]">{blurStrength}px</span>
                    </div>
                    <input type="range" min="0" max="12" value={blurStrength} onChange={(e) => setBlurStrength(parseInt(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#00F5C4]" />
                  </div>

                  {/* Slider for Chromatic aberration */}
                  <div className="space-y-1 font-sans">
                    <div className="flex justify-between items-center text-[8.5px] font-bold uppercase text-white/60">
                      <span>Chromatic Aberration offset (chromaticAberration())</span>
                      <span className="font-mono text-[#00F5C4]">{chromaticAberrationStrength}px</span>
                    </div>
                    <input type="range" min="0" max="10" value={chromaticAberrationStrength} onChange={(e) => setChromaticAberrationStrength(parseInt(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#00F5C4]" />
                  </div>

                  {/* Slider for vignette */}
                  <div className="space-y-1 font-sans">
                    <div className="flex justify-between items-center text-[8.5px] font-bold uppercase text-white/60">
                      <span>Vignette density (vignette())</span>
                      <span className="font-mono text-[#00F5C4]">{vignetteStrength}%</span>
                    </div>
                    <input type="range" min="0" max="80" value={vignetteStrength} onChange={(e) => setVignetteStrength(parseInt(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#00F5C4]" />
                  </div>

                  {/* Noise factor */}
                  <div className="space-y-1 font-sans">
                    <div className="flex justify-between items-center text-[8.5px] font-bold uppercase text-white/60 font-sans">
                      <span>Grain noise amount (noise())</span>
                      <span className="font-mono text-[#00F5C4]">{noiseStrength}%</span>
                    </div>
                    <input type="range" min="0" max="50" value={noiseStrength} onChange={(e) => setNoiseStrength(parseInt(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#00F5C4]" />
                  </div>
                </div>

                <div className="bg-[#181B21]/30 p-3 rounded-lg border border-[#23272F]/50 text-[10px] text-white/60 space-y-1 font-sans">
                  <p className="font-bold text-[#FFB800] uppercase text-[8px] tracking-wider text-left">How WebGL Shaders render</p>
                  <p>Remotion visual effects stack uses WebGL2 rendering targets on canvas buffers to apply real-time pixel modifications. Enable with <code className="font-mono text-white/85">Config.setChromiumOpenGlRenderer('angle')</code> on render server environments.</p>
                </div>
              </div>
            )}

            {/* 5. AUDIO SYNTHESIS & WAVEFORMS */}
            {explorerTab === "audio" && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="border-b border-[#23272F] pb-3">
                  <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">Audio Waveforms & Spectrum synthesis</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#FFB800] font-semibold mt-0.5">Visualize audio spectrum decibel lines reacting to playhead frames</p>
                </div>

                {/* Simulated SVG Audio Waveform spectrum */}
                <div className="bg-[#050608] border border-[#23272F] rounded-xl p-5 flex flex-col justify-end items-center h-32 relative">
                  <div className="flex gap-1.5 items-end justify-center w-full h-full pb-2">
                    {Array.from({ length: 24 }).map((_, idx) => {
                      // Generate simulated reactive heights based on frame
                      const factor = audioVolume / 100;
                      const offsetHeight = isPlaying 
                        ? Math.max(10, (25 + Math.sin(currentFrame * 0.25 + idx) * 20 + Math.cos(currentFrame * 0.1 - idx * 0.4) * 15) * factor)
                        : 15;
                      return (
                        <div 
                          key={idx} 
                          className="w-2.5 bg-gradient-to-t from-[#00F5C4] to-[#FFB800] rounded-full transition-all duration-75"
                          style={{ height: `${offsetHeight}%` }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[7.5px] font-mono text-white/40 uppercase">Simulated Audio visualizer decibels (useAudioData())</span>
                </div>

                {/* Volume db sliders */}
                <div className="space-y-2 font-sans text-left">
                  <div className="flex justify-between items-center text-[8px] font-mono text-white/60">
                    <span>Volume decibels factor (volume())</span>
                    <span>{audioVolume}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={audioVolume} onChange={(e) => setAudioVolume(parseInt(e.target.value))} className="w-full h-1 bg-[#181B21] rounded appearance-none cursor-pointer accent-[#FFB800]" />
                </div>
              </div>
            )}

            {/* 6. CLI & SSR COMMAND GENERATOR */}
            {explorerTab === "cli" && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="border-b border-[#23272F] pb-3">
                  <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">CLI Render Command Generator</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#00F5C4] font-semibold mt-0.5">Build copyable headless command line strings for terminal renders</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left font-sans">
                  <div className="space-y-1.5 font-sans">
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50">Output Codec</label>
                    <select value={cliCodec} onChange={(e) => setCliCodec(e.target.value)} className="w-full bg-[#181B21] border border-[#23272F] rounded p-2 text-xs focus:outline-none text-white appearance-none cursor-pointer">
                      <option value="h264">h264 (H.264 MP4 - Recommended)</option>
                      <option value="h265">h265 (H.265 HEVC)</option>
                      <option value="webm">vp8 / vp9 (WebM alpha supported)</option>
                      <option value="prores">prores (Apple ProRes high-quality)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-white/50">Scale factor</label>
                    <select value={cliScale} onChange={(e) => setCliScale(e.target.value)} className="w-full bg-[#181B21] border border-[#23272F] rounded p-2 text-xs focus:outline-none text-white appearance-none cursor-pointer">
                      <option value="1">1x (Original size)</option>
                      <option value="0.5">0.5x (Half width/height)</option>
                      <option value="2">2x (Double density)</option>
                    </select>
                  </div>
                </div>

                {/* Generated render CLI block */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[7.5px] text-white/40 uppercase tracking-widest font-black">Copy Command Line Interface (CLI)</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(getRenderCliCommand());
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }} 
                      className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer ${copiedSnippet ? "bg-[#00F5C4] text-black" : "bg-white/5 hover:bg-white/10 text-white/60 border border-white/5"}`}
                    >
                      {copiedSnippet ? "Copied! ✓" : "Copy Command"}
                    </button>
                  </div>
                  <pre className="p-3 bg-[#0A0B0D] rounded-lg border border-[#23272F]/50 text-[8.5px] font-mono text-white/80 overflow-x-auto select-all leading-relaxed">
                    {getRenderCliCommand()}
                  </pre>
                </div>
              </div>
            )}

            {/* 7. ENGINE HOOKS REFERENCE */}
            {explorerTab === "hooks" && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="border-b border-[#23272F] pb-3">
                  <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">Remotion Engine Lifecycle & Concurrency</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#FFB800] font-semibold mt-0.5">Test rendering pipeline concurrency and async loaders</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#181B21]/30 border border-[#23272F] rounded-xl text-left space-y-2">
                    <span className="text-[8.5px] font-bold uppercase text-[#FFB800] block">delayRender() simulation</span>
                    <p className="text-[9.5px] text-white/50 leading-relaxed font-sans">Blocks the render pipeline to wait for slow downloads or assets. Prevents frames from snapping preview cards prematurely.</p>
                    <button onClick={() => { setIsDelayActive(true); setDelayCountdown(3); }} className="px-3 py-1.5 bg-[#FFB800] hover:bg-[#FFB800]/90 text-[#0A0B0D] text-[9px] font-black uppercase rounded cursor-pointer transition-colors shadow">
                      Trigger delayRender()
                    </button>
                  </div>

                  <div className="p-4 bg-[#181B21]/30 border border-[#23272F] rounded-xl text-left space-y-1 font-mono text-[8.5px] text-white/70 leading-normal">
                    <span className="text-[8.5px] font-bold uppercase text-[#00F5C4] block font-sans mb-1">State Inspector</span>
                    <span>useCurrentFrame(): {currentFrame}</span><br />
                    <span>useVideoConfig().fps: {fps}</span><br />
                    <span>useVideoConfig().duration: {totalFrames}</span><br />
                    <span>staticFile(): public/font.ttf</span><br />
                    <span>delayRender(): {isDelayActive ? "BLOCKED ❌" : "RESOLVED ✓"}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* 15 ANIMATIONS SELECTOR CARD */}
          <div className="bg-[#111317] border border-[#23272F] rounded-xl overflow-hidden flex flex-col shadow-2xl font-sans">
            <div className="bg-[#0E1013] border-b border-[#23272F] px-4 py-3 flex justify-between items-center">
              <span className="text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Film className="w-3.5 h-3.5 text-[#FFB800]" /> Remotion Animations Library
              </span>
              <span className="text-[7.5px] text-white/40 uppercase font-mono">{animationType} active</span>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 p-3.5 bg-[#050608]/40">
              {ANIMATIONS_LIST.map((anim) => (
                <button key={anim.id} onClick={() => { setAnimationType(anim.id); setCurrentFrame(0); }} className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer hover:scale-[1.01] ${animationType === anim.id ? "bg-[#FFB800]/10 border-[#FFB800] text-white" : "bg-[#181B21]/40 border-[#23272F] hover:border-white/20 text-white/60 hover:text-white"}`}>
                  <span className="text-[9.5px] font-black uppercase tracking-wide truncate max-w-full">{anim.name}</span>
                  <span className="text-[6.5px] text-white/30 uppercase font-bold tracking-widest mt-0.5">{anim.category}</span>
                </button>
              ))}
            </div>

            <div className="p-3.5 text-left bg-[#0A0B0D]/90 border-t border-[#23272F]">
              <span className="text-[7.5px] text-[#00F5C4] uppercase tracking-widest font-black flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" /> Code Implementation (.tsx)
              </span>
              <pre className="text-[8px] font-mono text-white/70 leading-relaxed overflow-x-auto bg-[#050608] p-3 rounded-lg mt-2 max-h-48 scrollbar-thin border border-white/5">
                {getAnimationCodeSnippet()}
              </pre>
            </div>
          </div>

        </section>

      </main>

      {/* LOWER SECTION: REMOTION CORE API & EFFECTS DOCUMENTATION */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 font-sans">
        
        {/* REMOTION CORE API REFERENCE */}
        <div className="bg-[#111317]/80 backdrop-blur border border-[#23272F] rounded-xl p-5 text-left space-y-4 shadow-md font-sans">
          <div className="flex items-center gap-2 border-b border-[#23272F] pb-3">
            <BookOpen className="w-4 h-4 text-[#FFB800]" />
            <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">Remotion Core Functions Reference</h3>
          </div>

          <div className="space-y-3.5 text-xs text-white/80">
            <div className="border-b border-[#23272F]/50 pb-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[#00F5C4] font-bold">useCurrentFrame()</span>
                <span className="text-[7px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded font-black uppercase border border-white/10">Hook</span>
              </div>
              <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                Returns the current frame number of the video playback timeline. Increments by 1 every frame render step. Primarily used as the driver value for animations.
              </p>
            </div>

            <div className="border-b border-[#23272F]/50 pb-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[#00F5C4] font-bold">useVideoConfig()</span>
                <span className="text-[7px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded font-black uppercase border border-white/10">Hook</span>
              </div>
              <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                Provides video meta attributes: <code className="font-mono text-white/80">fps</code> (frames per second), <code className="font-mono text-white/80">width</code> & <code className="font-mono text-white/80">height</code> dimensions, and <code className="font-mono text-white/80">durationInFrames</code>.
              </p>
            </div>

            <div className="border-b border-[#23272F]/50 pb-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[#00F5C4] font-bold">interpolate(value, input, output, options)</span>
                <span className="text-[7px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded font-black uppercase border border-white/10">Function</span>
              </div>
              <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                Maps an input value (e.g. frame counter) to an output range (e.g. opacity, rotate, translate). Features clamp settings and custom easing functions.
              </p>
            </div>
          </div>
        </div>

        {/* UNUSED EFFECTS EXPLORER */}
        <div className="bg-[#111317]/80 backdrop-blur border border-[#23272F] rounded-xl p-5 text-left space-y-4 shadow-md font-sans">
          <div className="flex items-center gap-2 border-b border-[#23272F] pb-3">
            <Sparkles className="w-4 h-4 text-[#00F5C4]" />
            <h3 className="text-xs font-primary font-black uppercase tracking-wider text-white">Unused Text Effects & Future Options</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 3D Extrusion */}
            <div className="border border-[#23272F] rounded-lg p-3 bg-[#181B21]/15 space-y-2 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#00F5C4]">3D Extrusion</span>
                <span className="text-[7.5px] text-white/40 font-semibold">CSS Stack</span>
              </div>
              <div className="h-10 flex items-center justify-center bg-[#050608] rounded border border-[#23272F]/50">
                <span style={{ fontFamily: "'Anton', sans-serif", fontSize: "20px", fontWeight: "900", color: "#00F5C4", textShadow: "1px 1px 0 #005F4C, 2px 2px 0 #005F4C, 3px 3px 0 #005F4C, 4px 4px 6px rgba(0,0,0,0.6)" }}>3D TEXT</span>
              </div>
            </div>

            {/* 3D Perspective Tilt */}
            <div className="border border-[#23272F] rounded-lg p-3 bg-[#181B21]/15 space-y-2">
              <div className="flex justify-between items-center font-sans">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#00F5C4]">3D Perspective Tilt</span>
                <span className="text-[7.5px] text-white/40 font-semibold">CSS 3D</span>
              </div>
              <div className="h-10 flex items-center justify-center bg-[#050608] rounded border border-[#23272F]/50 overflow-hidden">
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "18px", fontWeight: "900", color: "#FFFFFF", transform: "perspective(300px) rotateX(25deg) rotateY(-15deg)", textShadow: "0 6px 12px rgba(0,0,0,0.4)" }}>PERSPECTIVE</span>
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
