"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studioService } from "@/services/studio";
import { ACTIVE_EFFECTS, ENTRANCES, type CaptionStyleV2, type ProjectSettings } from "@capseasy/shared";
import { KNOWN_FONTS, TEMPLATES, getTemplate } from "@capseasy/templates";
import { ColorField, Section, Segmented, Select, Slider, Toggle } from "../controls";

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x.replace(/-/g, " ") }));
const solid = (s: CaptionStyleV2) => (s.fill.type === "solid" ? s.fill.color : s.fill.stops[0]!.color);

interface StyleProps {
  style: CaptionStyleV2;
  patch: (fn: (s: CaptionStyleV2) => CaptionStyleV2) => void;
}

export const StylePanel: React.FC<StyleProps> = ({ style, patch }) => {
  const tpl = getTemplate(style.templateId);
  const caps = tpl.capabilities;
  const effects = ACTIVE_EFFECTS.filter((e) => caps.activeEffects.includes(e));
  const entrances = ENTRANCES.filter((e) => caps.entrances.includes(e));
  const reveal = style.templateOptions.reveal === "all" ? "all" : "progressive";
  const qc = useQueryClient();
  const brand = useQuery({ queryKey: ["brand"], queryFn: () => studioService.getBrand() });
  const colors = brand.data?.colors ?? [];
  const saveBrand = async () => {
    const mine = [solid(style), style.active.color, style.stroke.color, style.background.color].filter((c) => /^#[0-9a-f]{6}$/i.test(c));
    await studioService.saveBrand([...new Set([...mine, ...colors])].slice(0, 12), style.fontId);
    await qc.invalidateQueries({ queryKey: ["brand"] });
  };

  return (
    <div className="h-full overflow-y-auto">
      <Section title="Brand kit" hint={colors.length ? "Click a colour to use it as the highlight, Shift+click for the text." : "Save your colours and font once, reuse them on every project."}>
        {colors.length ? (
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <button key={c} title={c} aria-label={`Brand colour ${c}`} onClick={(e) => patch((s) => (e.shiftKey ? { ...s, fill: { type: "solid", color: c } } : { ...s, active: { ...s.active, color: c } }))} className="h-7 w-7 rounded-md border border-st-line" style={{ backgroundColor: c }} />
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void saveBrand()} className="rounded-md bg-st-raised px-2.5 py-1 text-xs hover:bg-st-hover">Save current colours &amp; font</button>
          {brand.data?.fontId && brand.data.fontId !== style.fontId ? (
            <button onClick={() => patch((s) => ({ ...s, fontId: brand.data!.fontId! }))} className="rounded-md bg-st-raised px-2.5 py-1 text-xs hover:bg-st-hover">Use brand font ({brand.data.fontId})</button>
          ) : null}
        </div>
      </Section>

      <Section title="Layout">
        <Select label="Template" value={style.templateId} options={TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} onChange={(v) => patch((s) => ({ ...s, templateId: v }))} />
        <p className="text-xs text-st-faint">{tpl.description}</p>
        {tpl.layout === "sentence" ? (
          <div className="flex items-center justify-between text-sm text-st-text/90">
            <span>Words appear</span>
            <Segmented value={reveal} options={[{ value: "progressive", label: "As spoken" }, { value: "all", label: "All at once" }]} onChange={(v) => patch((s) => ({ ...s, templateOptions: { ...s.templateOptions, reveal: v } }))} />
          </div>
        ) : null}
      </Section>

      <Section title="Text">
        <Select label="Font" value={style.fontId} options={KNOWN_FONTS.map((f) => ({ value: f, label: f }))} onChange={(v) => patch((s) => ({ ...s, fontId: v }))} />
        <Slider label="Size" value={style.fontSize} min={24} max={140} onChange={(v) => patch((s) => ({ ...s, fontSize: v }))} />
        {caps.weight ? <Slider label="Weight" value={style.fontWeight} min={300} max={900} step={100} onChange={(v) => patch((s) => ({ ...s, fontWeight: v }))} /> : null}
        <Select label="Case" value={style.casing} options={[{ value: "none", label: "As spoken" }, { value: "upper", label: "UPPERCASE" }, { value: "lower", label: "lowercase" }, { value: "title", label: "Title Case" }]} onChange={(v) => patch((s) => ({ ...s, casing: v as CaptionStyleV2["casing"] }))} />
        {caps.alignment ? <Select label="Align" value={style.align} options={opts(["left", "center", "right"])} onChange={(v) => patch((s) => ({ ...s, align: v as CaptionStyleV2["align"] }))} /> : null}
        <Slider label="Letter spacing" value={style.letterSpacing} min={-4} max={20} step={0.5} onChange={(v) => patch((s) => ({ ...s, letterSpacing: v }))} />
        <Slider label="Line height" value={style.lineHeight} min={0.8} max={2} step={0.05} onChange={(v) => patch((s) => ({ ...s, lineHeight: v }))} />
      </Section>

      <Section title="Color">
        {caps.color ? <ColorField label="Text" value={solid(style)} onChange={(v) => patch((s) => ({ ...s, fill: { type: "solid", color: v } }))} /> : null}
        <ColorField label={caps.hero ? "Highlight / hero" : "Highlight"} value={style.active.color} onChange={(v) => patch((s) => ({ ...s, active: { ...s.active, color: v } }))} />
        {effects.length > 1 ? <Select label="Spoken-word effect" value={style.active.effect} options={opts(effects)} onChange={(v) => patch((s) => ({ ...s, active: { ...s.active, effect: v as CaptionStyleV2["active"]["effect"] } }))} /> : null}
        {style.active.effect === "box" ? <ColorField label="Box color" value={style.active.boxColor ?? style.active.color} onChange={(v) => patch((s) => ({ ...s, active: { ...s.active, boxColor: v } }))} /> : null}
        {style.active.effect !== "none" && style.active.effect !== "color" ? <Slider label="Effect strength" value={style.active.scale} min={1} max={1.5} step={0.02} onChange={(v) => patch((s) => ({ ...s, active: { ...s.active, scale: v } }))} /> : null}
      </Section>

      {caps.hero ? (
        <Section title="Hero word" hint="The most important word on each card. Click a word in Captions to make it the hero.">
          <Slider label="Hero size" value={style.hero.scale} min={1} max={3} step={0.05} unit="×" onChange={(v) => patch((s) => ({ ...s, hero: { ...s.hero, scale: v } }))} />
          <Select label="Hero font" value={style.hero.fontId ?? style.fontId} options={KNOWN_FONTS.map((f) => ({ value: f, label: f }))} onChange={(v) => patch((s) => ({ ...s, hero: { ...s.hero, fontId: v } }))} />
        </Section>
      ) : null}

      <Section title="Outline & shadow">
        <Toggle label="Outline" checked={style.stroke.enabled} onChange={(v) => patch((s) => ({ ...s, stroke: { ...s.stroke, enabled: v } }))} />
        {style.stroke.enabled ? (
          <>
            <Slider label="Outline width" value={style.stroke.width} min={1} max={16} step={0.5} onChange={(v) => patch((s) => ({ ...s, stroke: { ...s.stroke, width: v } }))} />
            <ColorField label="Outline color" value={style.stroke.color} onChange={(v) => patch((s) => ({ ...s, stroke: { ...s.stroke, color: v } }))} />
          </>
        ) : null}
        <Toggle label="Drop shadow" checked={style.shadows.length > 0} onChange={(v) => patch((s) => ({ ...s, shadows: v ? [{ x: 0, y: 4, blur: 6, color: "rgba(0,0,0,0.6)" }] : [] }))} />
        <Toggle label="Glow" checked={style.glow.enabled} onChange={(v) => patch((s) => ({ ...s, glow: { ...s.glow, enabled: v, color: v && s.glow.color === "#FFFFFF" ? s.active.color : s.glow.color } }))} />
      </Section>

      {caps.background ? (
        <Section title="Background">
          <Select label="Style" value={style.background.type} options={opts(["none", "pill", "box"])} onChange={(v) => patch((s) => ({ ...s, background: { ...s.background, type: v as CaptionStyleV2["background"]["type"] } }))} />
          {style.background.type !== "none" ? (
            <>
              <ColorField label="Color" value={style.background.color} onChange={(v) => patch((s) => ({ ...s, background: { ...s.background, color: v } }))} />
              <Slider label="Opacity" value={style.background.opacity} min={0.1} max={1} step={0.05} onChange={(v) => patch((s) => ({ ...s, background: { ...s.background, opacity: v } }))} />
            </>
          ) : null}
        </Section>
      ) : null}

      <Section title="Position" hint="You can also drag the green handle on the video.">
        <Slider label="Vertical" value={Math.round(style.position.y * 100)} min={5} max={95} unit="%" onChange={(v) => patch((s) => ({ ...s, position: { ...s.position, y: v / 100 } }))} />
        <Slider label="Horizontal" value={Math.round(style.position.x * 100)} min={5} max={95} unit="%" onChange={(v) => patch((s) => ({ ...s, position: { ...s.position, x: v / 100 } }))} />
        <Slider label="Max width" value={Math.round(style.maxWidth * 100)} min={30} max={100} unit="%" onChange={(v) => patch((s) => ({ ...s, maxWidth: v / 100 }))} />
        <Slider label="Rotation" value={style.rotation} min={-15} max={15} step={0.5} unit="°" onChange={(v) => patch((s) => ({ ...s, rotation: v }))} />
      </Section>

      <Section title="Emoji" hint="Emoji pop above the caption when their word is spoken. Add them from the Captions tab.">
        <Toggle label="Show emoji" checked={style.emoji.enabled} onChange={(v) => patch((s) => ({ ...s, emoji: { ...s.emoji, enabled: v } }))} />
        {style.emoji.enabled ? (
          <>
            <Slider label="Emoji size" value={style.emoji.size} min={0.5} max={3} step={0.1} unit="×" onChange={(v) => patch((s) => ({ ...s, emoji: { ...s.emoji, size: v } }))} />
            <Select label="Animation" value={style.emoji.animation} options={opts(["pop", "float", "spin", "none"])} onChange={(v) => patch((s) => ({ ...s, emoji: { ...s.emoji, animation: v as CaptionStyleV2["emoji"]["animation"] } }))} />
          </>
        ) : null}
      </Section>

      <Section title="Motion">
        <Select label="Entrance" value={style.entrance.type} options={opts(entrances)} onChange={(v) => patch((s) => ({ ...s, entrance: { ...s.entrance, type: v as CaptionStyleV2["entrance"]["type"] } }))} />
        <Select label="Exit" value={style.exit.type} options={opts(["none", "fade", "fall", "zoom-out", "blur-out", "slide-up"])} onChange={(v) => patch((s) => ({ ...s, exit: { ...s.exit, type: v as CaptionStyleV2["exit"]["type"] } }))} />
        <Slider label="Motion intensity" value={style.motionIntensity} min={0} max={2} step={0.05} onChange={(v) => patch((s) => ({ ...s, motionIntensity: v }))} />
        <Slider label="Emotion reactivity" value={style.emotionReactivity} min={0} max={1} step={0.05} onChange={(v) => patch((s) => ({ ...s, emotionReactivity: v }))} />
      </Section>
    </div>
  );
};

interface SettingsProps {
  settings: ProjectSettings;
  patch: (p: Partial<ProjectSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsProps> = ({ settings, patch }) => (
  <div className="h-full overflow-y-auto">
    <Section title="Card size" hint="How much text shows at once.">
      <Slider label="Words per card" value={settings.maxWordsPerCard} min={1} max={12} onChange={(v) => patch({ maxWordsPerCard: v })} />
      <Slider label="Max lines" value={settings.maxLines} min={1} max={3} onChange={(v) => patch({ maxLines: v })} />
      <Slider label="Characters per line" value={settings.maxCharsPerLine} min={8} max={60} onChange={(v) => patch({ maxCharsPerLine: v })} />
    </Section>
    <Section title="Timing">
      <Slider label="Start a new card after a pause of" value={settings.pauseMs} min={150} max={1500} step={50} unit=" ms" onChange={(v) => patch({ pauseMs: v })} />
      <Slider label="Keep card on screen after speech" value={settings.holdMs} min={0} max={1500} step={50} unit=" ms" onChange={(v) => patch({ holdMs: v })} />
      <Slider label="Minimum card time" value={settings.minCardMs} min={200} max={2000} step={50} unit=" ms" onChange={(v) => patch({ minCardMs: v })} />
      <Select label="During silence" value={settings.gapBehavior} options={[{ value: "hold", label: "Keep last card" }, { value: "clear", label: "Clear screen" }]} onChange={(v) => patch({ gapBehavior: v as ProjectSettings["gapBehavior"] })} />
      <Slider label="Sync offset" value={settings.syncOffsetMs} min={-1000} max={1000} step={10} unit=" ms" onChange={(v) => patch({ syncOffsetMs: v })} />
    </Section>
    <Section title="Clean-up">
      <Toggle label="Remove filler words" hint="um, uh, hmm…" checked={settings.removeFillers} onChange={(v) => patch({ removeFillers: v })} />
      <Select label="Profanity" value={settings.profanity} options={[{ value: "off", label: "Leave as is" }, { value: "mask", label: "Mask (f***)" }, { value: "emoji", label: "Replace with 🤬" }, { value: "hide", label: "Hide" }]} onChange={(v) => patch({ profanity: v as ProjectSettings["profanity"] })} />
    </Section>
  </div>
);
