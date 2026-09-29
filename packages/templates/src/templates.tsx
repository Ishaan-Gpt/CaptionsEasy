import React from "react";
import { ACTIVE_EFFECTS, ENTRANCES } from "@capseasy/shared";
import { SentenceLayout } from "./layouts/Sentence";
import { Stack3Layout } from "./layouts/Stack3";
import { WordLayout } from "./layouts/Word";
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
];

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export { ENTRANCES };
