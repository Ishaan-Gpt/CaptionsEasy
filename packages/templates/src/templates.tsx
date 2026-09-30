import React from "react";
import { ACTIVE_EFFECTS, ENTRANCES } from "@capseasy/shared";
import { SentenceLayout } from "./layouts/Sentence";
import { Stack3Layout } from "./layouts/Stack3";
import { WordLayout } from "./layouts/Word";
import { BarLayout, BubbleLayout, HighlighterLayout, KaraokeLayout, KineticLayout, TypewriterLayout } from "./layouts/Extra";
import type { PageRenderProps, TemplateCapabilities, TemplateDefinition } from "./types";

const ALL_EFFECTS = ACTIVE_EFFECTS;
const CORE_ENTRANCES = ["none", "fade", "rise", "drop", "pop", "zoom", "slide-left", "slide-right", "blur-in", "flip", "elastic", "mask-reveal"] as const;

const caps = (over: Partial<TemplateCapabilities>): TemplateCapabilities => ({
  hero: true, alignment: true, stagger: false, accentPeriod: false, weight: true, color: true, background: true, emoji: false,
  activeEffects: ALL_EFFECTS, entrances: CORE_ENTRANCES, ...over,
});

const stack = (skinId: string): React.FC<PageRenderProps> => {
  const C: React.FC<PageRenderProps> = (p) => <Stack3Layout {...p} skinId={skinId} />;
  C.displayName = `Stack3(${skinId})`;
  return C;
};

/** The 8 legacy templates, ported. Capabilities mirror what each skin actually honours (legacy TEMPLATE_STYLES). */
export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "staggered_3line", name: "Staggered 3-Line", description: "Staggered layout with an Anton hero word", layout: "stack3",
    defaults: { fontId: "Outfit", fontWeight: 700, fontSize: 50, active: { effect: "color", color: "#00F5C4", scale: 1.08, boxRadius: 12 }, hero: { fontId: "Anton", fontWeight: 900, scale: 1.5, rotate: 0 }, templateOptions: { layoutMode: "splash" } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ alignment: false, stagger: true, weight: false }), fonts: ["Outfit", "Anton"], Page: stack("staggered_3line"),
  },
  {
    id: "glow_stack", name: "Glow Stack", description: "Rounded white text, flat deep-blue hero word, splash layout", layout: "stack3",
    defaults: { fontId: "Baloo 2", fontWeight: 800, fontSize: 50, active: { effect: "color", color: "#4FA8FF", scale: 1.08, boxRadius: 12 }, hero: { fontId: "Anton", fontWeight: 900, scale: 2.3, rotate: 0 }, templateOptions: { layoutMode: "splash" } },
    settingsDefaults: { maxWordsPerCard: 4 },
    capabilities: caps({ alignment: false, stagger: true, weight: false, color: false }), fonts: ["Baloo 2", "Anton"], Page: stack("glow_stack"),
  },
  {
    id: "cartoon_stack", name: "Cartoon Stack", description: "Playful Fredoka hero with a thick border and Caveat body", layout: "stack3",
    defaults: { fontId: "Fredoka", fontWeight: 700, fontSize: 50, active: { effect: "color", color: "#EDE0A6", scale: 1.08, boxRadius: 12 }, hero: { fontId: "Fredoka", fontWeight: 700, scale: 1.6, rotate: 0 } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ weight: false }), fonts: ["Fredoka", "Caveat"], Page: stack("cartoon_stack"),
  },
  {
    id: "serif_pop", name: "Serif Pop", description: "Bold brush-script hero word with a pop dot", layout: "stack3",
    defaults: { fontId: "Playfair Display", fontWeight: 800, fontSize: 50, active: { effect: "color", color: "#FFEE00", scale: 1.08, boxRadius: 12 }, hero: { fontId: "Kaushan Script", fontWeight: 400, scale: 1.8, rotate: 0 }, templateOptions: { accentPeriod: true } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ accentPeriod: true, weight: false, color: false }), fonts: ["Playfair Display", "Kaushan Script"], Page: stack("serif_pop"),
  },
  {
    id: "cinematic_emerald", name: "Cinematic Emerald", description: "Outfit body with a giant glowing italic Playfair hero", layout: "stack3",
    defaults: { fontId: "Outfit", fontWeight: 600, fontSize: 48, active: { effect: "color", color: "#8CFF3E", scale: 1.08, boxRadius: 12 }, hero: { fontId: "Playfair Display", fontWeight: 900, scale: 2.2, rotate: 0 } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ color: false }), fonts: ["Outfit", "Playfair Display"], Page: stack("cinematic_emerald"),
  },
  {
    id: "word_by_word", name: "Word by Word", description: "Single bold uppercase word owns the frame", layout: "word",
    defaults: { fontId: "Montserrat", fontWeight: 900, fontSize: 58, casing: "upper", active: { effect: "pop", color: "#00F5C4", scale: 1.08, boxRadius: 12 } },
    settingsDefaults: { maxWordsPerCard: 1 },
    capabilities: caps({ alignment: false }), fonts: ["Montserrat"], Page: WordLayout,
  },
  {
    id: "sentence_highlight", name: "Sentence Highlight", description: "Full segment with the spoken word popping", layout: "sentence",
    defaults: { fontId: "Inter", fontWeight: 900, fontSize: 54, active: { effect: "pop", color: "#00F5C4", scale: 1.12, boxRadius: 12 } },
    settingsDefaults: { maxWordsPerCard: 4 },
    capabilities: caps({}), fonts: ["Inter"], Page: SentenceLayout,
  },
  {
    id: "sentence_clean", name: "Sentence Clean", description: "Elegant, uniform typography with no highlight", layout: "sentence",
    defaults: { fontId: "Cinzel", fontWeight: 800, fontSize: 48, active: { effect: "none", color: "#FFFFFF", scale: 1.0, boxRadius: 12 } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ hero: false, activeEffects: ["none", "color"] }), fonts: ["Cinzel"], Page: SentenceLayout,
  },
  {
    id: "karaoke", name: "Karaoke", description: "Whole line visible; each word fills with colour as it's spoken", layout: "karaoke",
    defaults: { fontId: "Poppins", fontWeight: 800, fontSize: 56, inactiveOpacity: 1, active: { effect: "fill-sweep", color: "#FFD400", scale: 1, boxRadius: 12 }, stroke: { enabled: true, width: 3, color: "#000000" } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ hero: false, activeEffects: ["fill-sweep"] }), fonts: ["Poppins"], Page: KaraokeLayout,
  },
  {
    id: "boxed_word", name: "Boxed Word", description: "Full line; a solid box jumps to the word being spoken", layout: "sentence",
    defaults: { fontId: "Montserrat", fontWeight: 900, fontSize: 56, casing: "upper", templateOptions: { reveal: "all" }, active: { effect: "box", color: "#000000", boxColor: "#22C55E", scale: 1.06, boxRadius: 14 } },
    settingsDefaults: { maxWordsPerCard: 3 },
    capabilities: caps({ activeEffects: ["box", "pop", "color", "none"] }), fonts: ["Montserrat"], Page: SentenceLayout,
    emotionMap: { hype: { effect: "box", scale: 1.15 }, angry: { effect: "box" } },
  },
  {
    id: "typewriter", name: "Typewriter", description: "Letters type out as they're spoken, with a blinking cursor", layout: "typewriter",
    defaults: { fontId: "JetBrains Mono", fontWeight: 700, fontSize: 50, align: "left", entrance: { type: "none", durationMs: 0, stagger: "none", easing: "linear" }, active: { effect: "none", color: "#00FF66", scale: 1, boxRadius: 12 } },
    settingsDefaults: { maxWordsPerCard: 6, maxLines: 2 },
    capabilities: caps({ hero: false, activeEffects: ["none"], entrances: ["none"] }), fonts: ["JetBrains Mono"], Page: TypewriterLayout,
  },
  {
    id: "subtitle_bar", name: "Subtitle Bar", description: "Classic readable subtitles on a translucent bar", layout: "bar",
    defaults: { fontId: "Inter", fontWeight: 600, fontSize: 44, maxWidth: 0.9, position: { x: 0.5, y: 0.86 }, active: { effect: "none", color: "#FFFFFF", scale: 1, boxRadius: 12 }, background: { type: "bar", color: "#000000", opacity: 0.6, padding: 18, radius: 10, blur: 0 }, entrance: { type: "fade", durationMs: 120, stagger: "none", easing: "outCubic" } },
    settingsDefaults: { maxWordsPerCard: 10, maxLines: 2, maxCharsPerLine: 42 },
    capabilities: caps({ hero: false, activeEffects: ["none", "color", "underline"] }), fonts: ["Inter"], Page: BarLayout,
  },
  {
    id: "chat_bubble", name: "Chat Bubble", description: "Messages pop in as chat bubbles, alternating sides", layout: "bubble",
    defaults: { fontId: "Inter", fontWeight: 600, fontSize: 48, active: { effect: "color", color: "#FFFFFF", scale: 1, boxRadius: 12 }, background: { type: "bubble", color: "#0A84FF", opacity: 1, padding: 22, radius: 34, blur: 0 } },
    settingsDefaults: { maxWordsPerCard: 7, maxLines: 3 },
    capabilities: caps({ hero: false, alignment: false, activeEffects: ["none", "color", "underline"] }), fonts: ["Inter"], Page: BubbleLayout,
  },
  {
    id: "highlighter", name: "Highlighter", description: "A marker swipes behind the spoken word and stays on the key word", layout: "highlighter",
    defaults: { fontId: "Lexend", fontWeight: 700, fontSize: 52, fill: { type: "solid", color: "#111111" }, inactiveOpacity: 0.35, active: { effect: "marker", color: "#FDE047", scale: 1, boxRadius: 12 }, background: { type: "box", color: "#FFFFFF", opacity: 0.95, padding: 18, radius: 14, blur: 0 } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ activeEffects: ["marker"] }), fonts: ["Lexend"], Page: HighlighterLayout,
  },
  {
    id: "kinetic", name: "Kinetic", description: "Stacked words at different sizes; the key word huge and tilted", layout: "kinetic",
    defaults: { fontId: "Inter", fontWeight: 800, fontSize: 60, casing: "upper", hero: { fontId: "Anton", fontWeight: 900, scale: 1.8, rotate: -5 }, active: { effect: "pop", color: "#FFD400", scale: 1.1, boxRadius: 12 } },
    settingsDefaults: { maxWordsPerCard: 5 },
    capabilities: caps({ alignment: false, activeEffects: ["pop"] }), fonts: ["Inter", "Anton"], Page: KineticLayout,
  },
];

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export { ENTRANCES };
