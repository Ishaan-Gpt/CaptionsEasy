import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

/** The site's six colours (globals.css) plus mixes of them. Nothing else. */
export const C = {
  cream: "#FFFFEB",
  cream2: "#F4F4E0",
  beige: "#E4E4D0",
  lavender: "#F0D7FF",
  orange: "#FFA946",
  emerald: "#34D399",
  forest: "#0F3D2E",
  ink: "#1A1A1A",
  night: "#0D0D0C",
  muted: "#6E6E67",
  faint: "#A9A99C",
} as const;

/** "just upload." on the landing page */
export const BRAND_GRADIENT = `linear-gradient(90deg, ${C.ink}, ${C.orange}, ${C.emerald}, ${C.ink})`;

export const sans = loadJakarta("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
export const serif = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const FPS = 60;
export const W = 1920;
export const H = 1080;
/** 120 BPM: one beat is exactly 30 frames at 60 fps, one bar 120. */
export const BEAT = 30;
export const BAR = 120;
