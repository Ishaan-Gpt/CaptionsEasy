import type { CaptionStyleV2, Emotion } from "@capseasy/shared";
import type { EmotionModifier, TemplateDefinition } from "./types";

export type { EmotionModifier };

export const DEFAULT_EMOTION_MAP: Record<Emotion, EmotionModifier> = {
  neutral: {},
  calm: {},
  serious: {},
  excited: { accent: "#FFD400", effect: "pop", scale: 1.1, emoji: "🤩" },
  funny: { effect: "bounce", emoji: "😂" },
  sad: { accent: "#8FB8FF", emoji: "😢" },
  angry: { accent: "#FF3B3B", effect: "shake", emoji: "😠" },
  surprised: { accent: "#FF9F1C", effect: "pop", scale: 1.25, emoji: "😮" },
  question: { accent: "#4FD1FF", emoji: "🤔" },
  hype: { accent: "#FF3D7F", effect: "glow", scale: 1.15, emoji: "🔥" },
};

/** Thresholds on style.emotionReactivity (0..1): motion changes first, colours only when turned up high. */
export const EFFECT_THRESHOLD = 0.5;
const SWAPPABLE = new Set<CaptionStyleV2["active"]["effect"]>(["color", "pop", "scale-up", "bounce", "shake", "glow"]);
export const ACCENT_THRESHOLD = 0.8;

export function emotionModifier(tpl: TemplateDefinition, emotion: Emotion): EmotionModifier {
  return { ...DEFAULT_EMOTION_MAP[emotion], ...(tpl.emotionMap?.[emotion] ?? {}) };
}

/** Returns the style this card should render with, given its emotion. Pure. */
export function applyEmotion(style: CaptionStyleV2, tpl: TemplateDefinition, emotion: Emotion): CaptionStyleV2 {
  const r = style.emotionReactivity;
  if (emotion === "neutral" || r < EFFECT_THRESHOLD) return style;
  const m = emotionModifier(tpl, emotion);
  let active = style.active;
  // only swap GENERIC effects: a look's signature effect (box, marker, karaoke fill, underline...) is its identity,
  // and a calm look ("none") never gains motion
  if (m.effect && SWAPPABLE.has(active.effect) && tpl.capabilities.activeEffects.includes(m.effect)) active = { ...active, effect: m.effect };
  if (m.scale) active = { ...active, scale: Math.min(2, active.scale * (1 + (m.scale - 1) * r)) };
  if (m.accent && r >= ACCENT_THRESHOLD) active = { ...active, color: m.accent };
  return active === style.active ? style : { ...style, active };
}
