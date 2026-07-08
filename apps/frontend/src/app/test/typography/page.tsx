"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RemotionTestPlayer } from "@/components/test/RemotionTestPlayer";
import { ProjectLink } from "@/components/test/ProjectLink";
import { CodePanel } from "@/components/test/CodePanel";
import { SliderRow, Switch, ColorField, SegmentedControl } from "@/components/test/controls";
import { TypographyComposition } from "@/components/test/compositions/TypographyComposition";
import { PRODUCTION_FONT_FAMILIES, FONT_PRODUCTION_USAGE } from "@/components/test/productionFonts";

const CASINGS = ["none", "uppercase", "lowercase", "capitalize"] as const;
const WEIGHTS = ["400", "700", "800", "900"] as const;
const COLOR_MODES = ["solid", "gradient"] as const;

export default function TypographyPage() {
  const [text, setText] = useState("Explore CaptionsEasy typography");
  const [font, setFont] = useState("Outfit");
  const [size, setSize] = useState(64);
  const [weight, setWeight] = useState<(typeof WEIGHTS)[number]>("800");
  const [casing, setCasing] = useState<(typeof CASINGS)[number]>("none");
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [wordSpacing, setWordSpacing] = useState(0);
  const [lineSpacing, setLineSpacing] = useState(1.1);
  const [colorMode, setColorMode] = useState<(typeof COLOR_MODES)[number]>("solid");
  const [color, setColor] = useState("#FFFFFF");
  const [color2, setColor2] = useState("#00F5C4");
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [strokeThickness, setStrokeThickness] = useState(1.5);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(3);
  const [shadowBlur, setShadowBlur] = useState(6);
  const [shadowColor, setShadowColor] = useState("rgba(0,0,0,0.5)");

  const inputProps = useMemo(
    () => ({
      text,
      font,
      size,
      weight,
      casing,
      letterSpacing,
      wordSpacing,
      lineSpacing,
      colorMode,
      color,
      color2,
      strokeEnabled,
      strokeThickness,
      strokeColor,
      shadowEnabled,
      shadowX,
      shadowY,
      shadowBlur,
      shadowColor,
    }),
    [text, font, size, weight, casing, letterSpacing, wordSpacing, lineSpacing, colorMode, color, color2, strokeEnabled, strokeThickness, strokeColor, shadowEnabled, shadowX, shadowY, shadowBlur, shadowColor]
  );

  const code = `// Same font-loading + style-object approach as Subtitles.tsx's generic template
import { ensureProductionFontsLoaded } from "./productionFonts";

ensureProductionFontsLoaded(); // registers ${font} via FontFace, same as ensureFontsLoaded()

const style: React.CSSProperties = {
  fontFamily: '"${font}"',
  fontSize: "${size}px",
  fontWeight: "${weight}",
  textTransform: "${casing}",
  letterSpacing: "${letterSpacing}px",
  wordSpacing: "${wordSpacing}px",
  lineHeight: ${lineSpacing},${
    strokeEnabled
      ? `
  WebkitTextStroke: "${strokeThickness}px ${strokeColor}",
  paintOrder: "stroke fill",`
      : ""
  }${
    shadowEnabled
      ? `
  textShadow: "${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}",`
      : ""
  }${
    colorMode === "gradient"
      ? `
  backgroundImage: "linear-gradient(135deg, ${color}, ${color2})",
  WebkitBackgroundClip: "text",
  color: "transparent",`
      : `
  color: "${color}",`
  }
};`;

  return (
    <div className="min-h-screen bg-[#07080A] text-white antialiased pb-16">
      <header className="border-b border-[#23272F]/80 bg-[#0E1013]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center gap-3">
        <Link href="/test" className="p-1.5 rounded-full bg-[#181B21] border border-[#23272F] hover:border-[#FFB800] hover:text-[#FFB800] transition-colors cursor-pointer text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider">Typography</h1>
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Real Remotion text rendering — fonts, spacing, stroke, shadow, gradients</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          <RemotionTestPlayer component={TypographyComposition} inputProps={inputProps} durationInFrames={90} aspectRatio="9:16" />
          <ProjectLink
            file="apps/remotion-pipeline/src/Subtitles.tsx:926-936"
            description="These exact fields (text_transform, letter_spacing, word_spacing, line_spacing, color_mode, color2) are read straight from the caption payload in the generic template branch."
          />
          <ProjectLink
            file="apps/remotion-pipeline/src/fonts.ts"
            description={`ensureProductionFontsLoaded() here mirrors ensureFontsLoaded() exactly (same FontFace + delayRender pattern) using the identical .ttf files. ${font} usage in production: ${FONT_PRODUCTION_USAGE[font] ?? "available as a general body font"}.`}
          />
          <CodePanel code={code} />
        </div>

        <div className="space-y-5 bg-[#0E1013] border border-[#23272F] rounded-xl p-4 h-fit">
          <div className="space-y-1">
            <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Sandbox text</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-[#181B21] border border-[#23272F] text-xs rounded p-2 focus:outline-none focus:border-[#FFB800] text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Font family (production set)</label>
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              className="w-full bg-[#181B21] border border-[#23272F] text-xs rounded p-2 focus:outline-none focus:border-[#FFB800] cursor-pointer text-white"
            >
              {PRODUCTION_FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <SegmentedControl label="Weight" options={WEIGHTS} value={weight} onChange={setWeight} />
          <SegmentedControl label="Casing" options={CASINGS} value={casing} onChange={setCasing} />

          <SliderRow label="Size" value={size} min={16} max={140} onChange={setSize} unit="px" />
          <SliderRow label="Letter Spacing" value={letterSpacing} min={-4} max={20} step={0.5} onChange={setLetterSpacing} unit="px" />
          <SliderRow label="Word Spacing" value={wordSpacing} min={-4} max={30} step={0.5} onChange={setWordSpacing} unit="px" />
          <SliderRow label="Line Spacing" value={lineSpacing} min={0.8} max={2} step={0.05} onChange={setLineSpacing} />

          <div className="border-t border-[#23272F]/50 pt-3 space-y-3">
            <SegmentedControl label="Color Mode" options={COLOR_MODES} value={colorMode} onChange={setColorMode} />
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Color" value={color} onChange={setColor} />
              {colorMode === "gradient" && <ColorField label="Color 2" value={color2} onChange={setColor2} />}
            </div>
          </div>

          <div className="border-t border-[#23272F]/50 pt-3 space-y-2">
            <Switch label="Stroke" description="WebkitTextStroke outline" checked={strokeEnabled} onChange={setStrokeEnabled} />
            {strokeEnabled && (
              <>
                <SliderRow label="Thickness" value={strokeThickness} min={0.5} max={8} step={0.5} onChange={setStrokeThickness} unit="px" />
                <ColorField label="Stroke Color" value={strokeColor} onChange={setStrokeColor} />
              </>
            )}
          </div>

          <div className="border-t border-[#23272F]/50 pt-3 space-y-2">
            <Switch label="Shadow" description="textShadow drop shadow" checked={shadowEnabled} onChange={setShadowEnabled} />
            {shadowEnabled && (
              <>
                <SliderRow label="Offset X" value={shadowX} min={-20} max={20} onChange={setShadowX} unit="px" />
                <SliderRow label="Offset Y" value={shadowY} min={-20} max={20} onChange={setShadowY} unit="px" />
                <SliderRow label="Blur" value={shadowBlur} min={0} max={40} onChange={setShadowBlur} unit="px" />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
