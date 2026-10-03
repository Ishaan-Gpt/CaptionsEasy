import React, { useMemo } from "react";
import { CaptionDocSchema, ProjectSettingsSchema, type CaptionStyleV2 } from "@capseasy/shared";
import { computePages } from "@capseasy/compositions";
import { PageView, applyLook, getLook, getTemplate, measure, resolveStyle, deepMerge, useFontsReady, type Canvas } from "@capseasy/templates";
import { FPS } from "../theme";

export type TimedWord = { text: string; startMs: number; endMs: number };

/** The product renders captions on a 1080×1920 canvas; we do the same and let the phone scale it down. */
export const CANVAS: Canvas = { width: 1080, height: 1920, fps: FPS };

export function lookStyle(lookId: string, override: Record<string, unknown> = {}) {
  const look = getLook(lookId);
  if (!look) throw new Error(`unknown look ${lookId}`);
  const { style, settings } = applyLook(look, 3);
  return { style: resolveStyle(deepMerge(style, override) as Partial<CaptionStyleV2>), settings, name: look.name };
}

export function lookFonts(style: CaptionStyleV2) {
  return [style.fontId, style.hero.fontId ?? "", ...getTemplate(style.templateId).fonts];
}

/**
 * Captions from the REAL engine (the same pages and templates the product exports with), but driven by a time
 * value instead of the frame, so a scene can speed-ramp, freeze or rewind them.
 */
export const LookCaptions: React.FC<{
  lookId: string;
  words: TimedWord[];
  timeMs: number;
  override?: Record<string, unknown>;
  wordsPerCard?: number;
  /** scales the look's own font size (phones in a 1080p film need bigger type than a real phone) */
  sizeMul?: number;
  /** defaults to the product's 1080×1920 phone canvas */
  canvas?: Canvas;
}> = ({ lookId, words, timeMs, override, wordsPerCard, sizeMul = 1, canvas = CANVAS }) => {
  const { style, settings } = useMemo(() => {
    const base = lookStyle(lookId, override);
    return sizeMul === 1 ? base : { ...base, style: { ...base.style, fontSize: base.style.fontSize * sizeMul } };
  }, [lookId, override, sizeMul]);
  const ready = useFontsReady(lookFonts(style));
  const pages = useMemo(() => {
    if (!ready) return [];
    const doc = CaptionDocSchema.parse({ version: 2, language: "en", words: words.map((w, i) => ({ id: `w${i}`, ...w })) });
    const s = ProjectSettingsSchema.parse({ ...settings, ...(wordsPerCard ? { maxWordsPerCard: wordsPerCard } : {}) });
    return computePages(doc, s, style, canvas);
  }, [ready, words, settings, style, wordsPerCard, canvas]);
  const page = pages.find((p) => timeMs >= p.startMs && timeMs < p.endMs);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: canvas.width, height: canvas.height, pointerEvents: "none" }}>
      {page ? <PageView page={page} timeMs={timeMs} style={style} canvas={canvas} measure={measure} /> : null}
    </div>
  );
};

/** Evenly timed words for phrases we write ourselves (value props, demo lines). */
export function timedPhrase(text: string, startMs = 0, perWordMs = 330): TimedWord[] {
  return text.split(" ").map((t, i) => ({ text: t, startMs: startMs + i * perWordMs, endMs: startMs + (i + 1) * perWordMs - 20 }));
}
