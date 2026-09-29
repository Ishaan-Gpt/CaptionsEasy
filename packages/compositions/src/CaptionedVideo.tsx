import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { CaptionDocSchema, type CaptionStyleV2, ProjectSettingsSchema, type CaptionDoc, type Page, type ProjectSettings } from "@capseasy/shared";
import { applyFillerFilter, applyProfanity, derivePages } from "@motion-ai/caption-engine/core";
import { PageView, famCss, getTemplate, layoutBox, measure, resolveStyle, scaleOf, useFontsReady, type Canvas } from "@capseasy/templates";
import type { CaptionedVideoInput } from "./props";

/** Doc -> what the audience should see (filters are display-time, so the stored doc is never mutated). */
export function prepareDoc(doc: CaptionDoc, settings: ProjectSettings): CaptionDoc {
  let d = doc;
  if (settings.removeFillers) d = applyFillerFilter(d, settings.fillerList.length ? settings.fillerList : undefined, true);
  if (settings.profanity !== "off") d = applyProfanity(d, settings.profanity);
  return d;
}

const PageSequence: React.FC<{ page: Page; fromFrame: number; canvas: Canvas; style: CaptionStyleV2 }> = ({ page, fromFrame, canvas, style }) => {
  const frame = useCurrentFrame();
  // absolute media time, derived from frames only (never a wall clock)
  const timeMs = ((fromFrame + frame) / canvas.fps) * 1000;
  const pageStyle = page.styleOverride ? resolveStyle(style, page.styleOverride) : style;
  return <PageView page={page} timeMs={timeMs} style={pageStyle} canvas={canvas} measure={measure} />;
};

/**
 * Remotion does NOT run inputProps through the zod schema at render time, and the Player passes props
 * verbatim, so every surface must normalize here. Partial settings/styles are completed with defaults.
 */
export const CaptionedVideo: React.FC<CaptionedVideoInput> = ({ src = null, doc: docIn, style: styleIn, settings: settingsIn, mode = "burn" }) => {
  const doc = useMemo(() => CaptionDocSchema.parse(docIn ?? { version: 2, words: [] }), [docIn]);
  const settings = useMemo(() => ProjectSettingsSchema.parse(settingsIn ?? {}), [settingsIn]);
  const style = styleIn ?? {};
  const { fps, width, height } = useVideoConfig();
  const canvas = useMemo<Canvas>(() => ({ width, height, fps }), [width, height, fps]);
  const resolved = useMemo(() => resolveStyle(style as Partial<CaptionStyleV2>), [style]);

  const fontFamilies = useMemo(() => [resolved.fontId, resolved.hero.fontId ?? "", ...getTemplate(resolved.templateId).fonts], [resolved]);
  const fontsReady = useFontsReady(fontFamilies);

  const pages = useMemo(() => {
    if (!fontsReady) return [];
    const sc = scaleOf(canvas);
    const box = layoutBox(resolved, canvas);
    const spec = { fontFamily: famCss(resolved.fontId), fontWeight: resolved.fontWeight, fontStyle: resolved.fontStyle, letterSpacing: resolved.letterSpacing * sc };
    return derivePages(prepareDoc(doc, settings), settings, {
      measure: (text) => measure(text, { ...spec, fontSize: resolved.fontSize * sc }),
      maxLineWidth: box.width,
    });
  }, [fontsReady, doc, settings, resolved, canvas]);

  return (
    <AbsoluteFill>
      {mode === "burn" && src ? (
        <AbsoluteFill style={{ backgroundColor: "black" }}>
          <OffthreadVideo src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </AbsoluteFill>
      ) : null}
      {pages.map((page) => {
        const from = Math.floor((page.startMs / 1000) * fps);
        const duration = Math.max(1, Math.ceil(((page.endMs - page.startMs) / 1000) * fps));
        return (
          <Sequence key={page.id} from={from} durationInFrames={duration} layout="none">
            <PageSequence page={page} fromFrame={from} canvas={canvas} style={resolved} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
