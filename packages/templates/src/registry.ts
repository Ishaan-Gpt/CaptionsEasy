import { CaptionStyleSchema, type CaptionStyleV2, type ProjectSettings } from "@capseasy/shared";
import legacyLooks from "./looks/legacy.generated.json";
import { NEW_LOOKS } from "./looks/new";
import { TEMPLATES } from "./templates";
import type { LookDefinition, TemplateDefinition } from "./types";

const byId = new Map<string, TemplateDefinition>(TEMPLATES.map((t) => [t.id, t]));
export const FALLBACK_TEMPLATE = "sentence_highlight";

let warned = new Set<string>();
/** Unknown ids never crash a render: fall back loudly (once) instead of silently mis-rendering. */
export function getTemplate(id: string): TemplateDefinition {
  const t = byId.get(id);
  if (t) return t;
  if (!warned.has(id)) {
    warned.add(id);
    console.warn(`[capseasy] unknown caption template "${id}", falling back to "${FALLBACK_TEMPLATE}"`);
  }
  return byId.get(FALLBACK_TEMPLATE)!;
}
export const hasTemplate = (id: string) => byId.has(id);
export const listTemplates = (): TemplateDefinition[] => TEMPLATES;

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);

/** Deep merge; arrays and scalars replace. `undefined` in the patch is ignored. */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlain(base) || !isPlain(patch)) return (patch === undefined ? base : patch) as T;
  const out: Plain = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isPlain(out[k]) && isPlain(v) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** Template defaults <- (look or project style) <- card override. Always returns a fully valid style. */
export function resolveStyle(style: Partial<CaptionStyleV2> & { templateId?: string }, cardOverride?: Record<string, unknown> | null): CaptionStyleV2 {
  const tpl = getTemplate(style.templateId ?? FALLBACK_TEMPLATE);
  let merged = deepMerge(CaptionStyleSchema.parse({ templateId: tpl.id, ...tpl.defaults }) as unknown, style) as Plain;
  if (cardOverride) merged = deepMerge(merged, cardOverride);
  return CaptionStyleSchema.parse({ ...merged, templateId: tpl.id });
}

/**
 * Curated gallery: ONE look per distinct visual identity (layout + motion + typographic character).
 * Colour-only variants were removed; users recolour any look in the Style panel or save their own.
 * Projects that used a removed look keep rendering (their full style is stored on the project).
 */
const CURATED_NEW = new Set([
  "hormozi_box", "beast_bounce", "karaoke_fill", "pop_clean", "gradient_pop", "emoji_react", "outline_fill", "bold_pill",
  "comic_burst", "wave_bounce", "storytime", "chat_bubble", "scribble",
  "minimal_pro", "netflix_sub", "lower_third", "read_along",
  "luxe_serif", "motivational", "film_noir", "kinetic_mix",
  "retro_vhs", "retro_3d", "neon_sign", "terminal", "gaming_hud",
  "highlighter_card", "explainer", "desi_clean",
]);
// the five three-line stack skins are genuinely different designs; the other legacy looks were colour variants
const CURATED_LEGACY = new Set(["staggered_splash", "glow_stack_classic", "cartoon_stack_classic", "serif_pop_classic", "vintage_cinematic"]);
/**
 * The stack skins used to ignore the stored spoken-word effect ("pop") and hard-code some body fonts. Now that
 * those controls are wired, pin what these looks actually showed so they render exactly as before.
 */
const LEGACY_FIXES: Record<string, unknown> = {
  staggered_splash: { active: { effect: "none" } },
  glow_stack_classic: { active: { effect: "none" } },
  cartoon_stack_classic: { fontId: "Caveat", active: { effect: "none" } },
  serif_pop_classic: { active: { effect: "color" } },
  vintage_cinematic: { active: { effect: "none" } },
};

export const LOOKS: LookDefinition[] = [
  ...NEW_LOOKS.filter((l) => CURATED_NEW.has(l.id)).map((l) => ({ ...l, style: resolveStyle({ ...l.style, templateId: l.templateId }) })),
  ...(legacyLooks as unknown as LookDefinition[]).filter((l) => CURATED_LEGACY.has(l.id)).map((l) => ({ ...l, category: "Classic", style: CaptionStyleSchema.parse(deepMerge(l.style, LEGACY_FIXES[l.id])) })),
];

const looksById = new Map(LOOKS.map((l) => [l.id, l]));
export const getLook = (id: string | null | undefined): LookDefinition | undefined => (id ? looksById.get(id) : undefined);
export const lookCategories = (): string[] => [...new Set(LOOKS.map((l) => l.category))];

/** Switch look: keeps content, replaces styling wholesale (the look is a complete style). */
export function applyLook(look: LookDefinition): { style: CaptionStyleV2; settings: Partial<ProjectSettings> } {
  return { style: resolveStyle(look.style), settings: look.settings };
}
