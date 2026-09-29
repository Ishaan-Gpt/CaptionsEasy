import { describe, expect, it, vi } from "vitest";
import { CaptionStyleSchema } from "@capseasy/shared";
import { FALLBACK_TEMPLATE, LOOKS, TEMPLATE_IDS, applyLook, deepMerge, getLook, getTemplate, lookCategories, resolveStyle } from "./index";

describe("template registry", () => {
  it("ships the 8 legacy templates", () => {
    expect(TEMPLATE_IDS).toEqual(["staggered_3line", "glow_stack", "cartoon_stack", "serif_pop", "cinematic_emerald", "word_by_word", "sentence_highlight", "sentence_clean"]);
  });

  it("every template resolves to a fully valid style", () => {
    for (const id of TEMPLATE_IDS) {
      const s = resolveStyle({ templateId: id });
      expect(CaptionStyleSchema.safeParse(s).success).toBe(true);
      expect(s.templateId).toBe(id);
    }
  });

  it("unknown template falls back loudly instead of crashing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(getTemplate("hormozi_block").id).toBe(FALLBACK_TEMPLATE);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("carries all 25 legacy looks, each pointing at a real template", () => {
    expect(LOOKS).toHaveLength(25);
    expect(new Set(LOOKS.map((l) => l.id)).size).toBe(25);
    for (const l of LOOKS) expect(TEMPLATE_IDS).toContain(l.templateId);
    expect(lookCategories().length).toBeGreaterThan(4);
  });

  it("applyLook returns the look's style and timing settings", () => {
    const look = getLook("mrbeast_punch")!;
    const { style, settings } = applyLook(look);
    expect(style.templateId).toBe("word_by_word");
    expect(style.fontId).toBe("Lilita One");
    expect(settings.maxWordsPerCard).toBe(1);
  });

  it("system fonts were swapped for deterministic Google fonts", () => {
    const fonts = new Set(LOOKS.map((l) => l.style.fontId));
    for (const bad of ["Georgia", "Impact", "Consolas", "Comic Sans MS"]) expect(fonts.has(bad)).toBe(false);
  });

  it("deepMerge merges objects, replaces arrays, ignores undefined", () => {
    expect(deepMerge({ a: { b: 1, c: 2 }, d: [1] }, { a: { b: 9 }, d: [2, 3], e: undefined })).toEqual({ a: { b: 9, c: 2 }, d: [2, 3] });
  });

  it("card overrides win over the look", () => {
    const s = resolveStyle({ templateId: "sentence_highlight" }, { fontSize: 99, active: { color: "#123456" } });
    expect(s.fontSize).toBe(99);
    expect(s.active.color).toBe("#123456");
    expect(s.active.effect).toBe("pop");
  });
});
