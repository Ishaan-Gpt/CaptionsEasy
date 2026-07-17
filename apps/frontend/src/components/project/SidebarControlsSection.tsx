"use client";

import React from "react";
import { TemplateSwatch } from "@/components/TemplateSwatch";
import { TEMPLATE_PRESETS_LIST } from "@/config/captionTemplates";

// Picks the heavier of two CSS-style font weights
const maxWeight = (a: string, b: string): string => {
  const toInt = (w: string) => (/^\d+$/.test(w) ? parseInt(w, 10) : w.toLowerCase() === "bold" ? 700 : 400);
  return toInt(a) >= toInt(b) ? a : b;
};

const POPULAR_FONTS = [
  // Modern Sans-serifs
  "Outfit", "Inter", "Montserrat", "Poppins", "Roboto", "Lato", "Open Sans", "Nunito", "Rubik", "Kanit", "Heebo", "Work Sans", "Quicksand", "Josefin Sans", "Fira Sans", "Barlow", "Cabin", "Manrope", "Albert Sans", "Plus Jakarta Sans", "Urbanist", "Lexend", "DM Sans", "Hanken Grotesk", "Hind", "Arimo", "Assistant", "Bitter", "Dosis", "Ubuntu", "PT Sans", "Karla",
  // Heavy Display & Comic
  "Anton", "Bungee", "Dela Gothic One", "Lilita One", "Titan One", "Paytone One", "Carter One", "Black Ops One", "Sigmar", "Rammetto One", "Bowlby One SC", "Passion One", "Alfa Slab One", "Bungee Spice", "Rowdy", "Archivo Black", "Concert One", "Righteous", "Russo One", "Squada One", "Chivo", "Luckiest Guy", "Fredoka One", "Fredoka", "Chewy", "Bangers", "Patua One", "Shrikhand", "Ultra", "Fascinate Inline", "Creepster",
  // Handwritings & Scripts
  "Caveat", "Permanent Marker", "Pacifico", "Kalam", "Gochi Hand", "Patrick Hand", "Shadows Into Light", "Amatic SC", "Gloria Hallelujah", "Just Another Hand", "Indie Flower", "Architects Daughter", "Sacramento", "Great Vibes", "Kaushan Script", "Allura", "Courgette", "Alex Brush", "Dancing Script", "Satisfy", "Yellowtail", "Cookie", "Parisienne", "Pinyon Script", "Lobster", "Playball",
  // Serif & Elegant
  "Playfair Display", "Lora", "Merriweather", "Georgia", "PT Serif", "Cinzel", "Cormorant Garamond", "EB Garamond", "Libre Baskerville", "Cardo", "Noto Serif", "DM Serif Display", "Prata", "Domine", "Alice", "Castoro", "Unna", "Bodoni Moda", "Newsreader", "Vollkorn", "Cinzel Decorative", "Arapey",
  // Monospace & Typewriters
  "JetBrains Mono", "Fira Code", "Source Code Pro", "Space Mono", "Inconsolata", "Share Tech Mono", "VT323", "Cutive Mono", "IBM Plex Mono", "Roboto Mono", "Courier Prime", "Special Elite", "Major Mono Display"
];

const TRENDING_CAPTION_TEMPLATES = new Set([
  "staggered_3line",
  "glow_stack",
  "cartoon_stack",
  "serif_pop",
  "cinematic_emerald",
]);

const TRENDING_TEMPLATE_PRESETS = TEMPLATE_PRESETS_LIST.filter((p) =>
  TRENDING_CAPTION_TEMPLATES.has(p.caption_template)
);
const BUILTIN_TEMPLATE_PRESETS = TEMPLATE_PRESETS_LIST.filter(
  (p) => !TRENDING_CAPTION_TEMPLATES.has(p.caption_template)
);

interface SidebarControlsSectionProps {
  activeTab: "text" | "templates";
  setActiveTab: (tab: "text" | "templates") => void;
  
  // Custom Styles state & setters
  customFont: string; setCustomFont: (v: string) => void;
  customSize: number; setCustomSize: (v: number) => void;
  customWeight: string; setCustomWeight: (v: string) => void;
  customColor: string; setCustomColor: (v: string) => void;
  customHighlightColor: string; setCustomHighlightColor: (v: string) => void;
  customShadow: number; setCustomShadow: (v: number) => void;
  customOutline: number; setCustomOutline: (v: number) => void;
  customBackgroundStyle: string; setCustomBackgroundStyle: (v: string) => void;
  customYPositionPercent: number; setCustomYPositionPercent: (v: number) => void;
  customCaptionTemplate: string; setCustomCaptionTemplate: (v: string) => void;
  customStaggeredLayout: "splash" | "centre"; setCustomStaggeredLayout: (v: "splash" | "centre") => void;
  customWordLimit: number; setCustomWordLimit: (v: number) => void;
  customCaptionSpacingMs: number; setCustomCaptionSpacingMs: (v: number) => void;
  customWordPacing: string; setCustomWordPacing: (v: string) => void;
  customPauseHandling: string; setCustomPauseHandling: (v: string) => void;
  customAccentPeriodEnabled: boolean; setCustomAccentPeriodEnabled: (v: boolean) => void;
  
  customFontFace: string; setCustomFontFace: (v: string) => void;
  customCasing: "none" | "uppercase" | "lowercase" | "capitalize"; setCustomCasing: (v: "none" | "uppercase" | "lowercase" | "capitalize") => void;
  customUnderline: boolean; setCustomUnderline: (v: boolean) => void;
  customAlignment: "left" | "center" | "right"; setCustomAlignment: (v: "left" | "center" | "right") => void;
  customXPositionPercent: number; setCustomXPositionPercent: (v: number) => void;
  customColorMode: "solid" | "gradient"; setCustomColorMode: (v: "solid" | "gradient") => void;
  customColor2: string; setCustomColor2: (v: string) => void;
  customLetterSpacing: number; setCustomLetterSpacing: (v: number) => void;
  customWordSpacing: number; setCustomWordSpacing: (v: number) => void;
  customLineSpacing: number; setCustomLineSpacing: (v: number) => void;

  // Box margins
  customBoxTop: number; setCustomBoxTop: (v: number) => void;
  customBoxBottom: number; setCustomBoxBottom: (v: number) => void;
  customBoxLeft: number; setCustomBoxLeft: (v: number) => void;
  customBoxRight: number; setCustomBoxRight: (v: number) => void;
  boxEditMode: boolean; setBoxEditMode: (v: boolean) => void;

  // Target word settings
  editTarget: "primary" | "secondary"; setEditTarget: (v: "primary" | "secondary") => void;
  heroFont: string; setHeroFont: (v: string) => void;
  heroFontFace: string; setHeroFontFace: (v: string) => void;
  heroSizeScale: number; setHeroSizeScale: (v: number) => void;

  shadowEnabled: boolean; setShadowEnabled: (v: boolean) => void;
  strokeEnabled: boolean; setStrokeEnabled: (v: boolean) => void;
  backgroundEnabled: boolean; setBackgroundEnabled: (v: boolean) => void;
  selectedBackgroundStyle: "pill" | "shadow-box"; setSelectedBackgroundStyle: (v: "pill" | "shadow-box") => void;
  
  expandedTemplateId: string | null; setExpandedTemplateId: (v: string | null) => void;
  styleError: string | null;

  saveStyleImmediate: (overrides?: any) => Promise<void>;
  saveStyleBackground: (overrides?: any) => void;
  handleTemplateClick: (tplId: string) => Promise<void>;

  // Motion + effect controls rendered by the shared CaptionEngine
  customEntranceAnim: "none" | "rise" | "pop" | "fade";
  setCustomEntranceAnim: (v: "none" | "rise" | "pop" | "fade") => void;
  customHighlightAnim: "pop" | "flash" | "underline" | "glow";
  setCustomHighlightAnim: (v: "pop" | "flash" | "underline" | "glow") => void;
  customOutlineColor: string; setCustomOutlineColor: (v: string) => void;
  customShadowColor: string; setCustomShadowColor: (v: string) => void;
}

/** What each template locks by design — shown as a hint so the controls
 * that a template overrides don't feel broken when they have no effect. */
const TEMPLATE_LOCK_HINTS: Record<string, string> = {
  glow_stack: "Body font is fixed to Baloo 2 — hero font, colors, and motion stay editable.",
  cartoon_stack: "Body font is fixed to Caveat handwriting; the bubble outline color follows the highlight color.",
  serif_pop: "Body is always white with the spoken word flashing the highlight color; the hero pop-dot uses the highlight color.",
  cinematic_emerald: "Hero word is always an italic gradient of the highlight color with a glow halo.",
  staggered_3line: "Body and hero both carry the outline; the splash layout anchors lines to the hero's edges.",
  sentence_clean: "Uniform by design — no hero word or per-word highlight.",
};

export const SidebarControlsSection: React.FC<SidebarControlsSectionProps> = ({
  activeTab, setActiveTab,
  customFont, setCustomFont,
  customSize, setCustomSize,
  customWeight, setCustomWeight,
  customColor, setCustomColor,
  customHighlightColor, setCustomHighlightColor,
  customShadow, setCustomShadow,
  customOutline, setCustomOutline,
  customBackgroundStyle, setCustomBackgroundStyle,
  customYPositionPercent, setCustomYPositionPercent,
  customCaptionTemplate, setCustomCaptionTemplate,
  customStaggeredLayout, setCustomStaggeredLayout,
  customWordLimit, setCustomWordLimit,
  customCaptionSpacingMs, setCustomCaptionSpacingMs,
  customWordPacing, setCustomWordPacing,
  customPauseHandling, setCustomPauseHandling,
  customAccentPeriodEnabled, setCustomAccentPeriodEnabled,
  customFontFace, setCustomFontFace,
  customCasing, setCustomCasing,
  customUnderline, setCustomUnderline,
  customAlignment, setCustomAlignment,
  customXPositionPercent, setCustomXPositionPercent,
  customColorMode, setCustomColorMode,
  customColor2, setCustomColor2,
  customLetterSpacing, setCustomLetterSpacing,
  customWordSpacing, setCustomWordSpacing,
  customLineSpacing, setCustomLineSpacing,
  customBoxTop, setCustomBoxTop,
  customBoxBottom, setCustomBoxBottom,
  customBoxLeft, setCustomBoxLeft,
  customBoxRight, setCustomBoxRight,
  boxEditMode, setBoxEditMode,
  editTarget, setEditTarget,
  heroFont, setHeroFont,
  heroFontFace, setHeroFontFace,
  heroSizeScale, setHeroSizeScale,
  shadowEnabled, setShadowEnabled,
  strokeEnabled, setStrokeEnabled,
  backgroundEnabled, setBackgroundEnabled,
  selectedBackgroundStyle, setSelectedBackgroundStyle,
  expandedTemplateId, setExpandedTemplateId,
  styleError,
  saveStyleImmediate, saveStyleBackground,
  customEntranceAnim, setCustomEntranceAnim,
  customHighlightAnim, setCustomHighlightAnim,
  customOutlineColor, setCustomOutlineColor,
  customShadowColor, setCustomShadowColor,
  handleTemplateClick,
}) => {
  return (
    <section className="w-80 bg-[#1E170D] border-r border-[#3B301C] flex flex-col shrink-0">
      {/* Sidebar Tabs Header */}
      <div className="flex border-b border-[#3B301C] bg-[#1A140B]/60 shrink-0">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 py-3 text-[10px] font-sora font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
            activeTab === "text"
              ? "text-[#DCC8A4] border-b-2 border-[#DCC8A4] bg-[#1E170D]"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          Text Settings
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex-1 py-3 text-[10px] font-sora font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
            activeTab === "templates"
              ? "text-[#DCC8A4] border-b-2 border-[#DCC8A4] bg-[#1E170D]"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          Templates
        </button>
      </div>

      {/* Sidebar Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === "text" ? (
          // TEXT TAB SETTINGS
          <div className="space-y-4 text-left">
            
            {/* Editing target toggle (Primary vs. Secondary/Hero) */}
            {customCaptionTemplate !== "sentence_clean" && (
              <div className="space-y-1">
                <label className="block text-[7px] font-bold uppercase tracking-wider text-white/40">Editing Target</label>
                <div className="flex border border-[#3B301C] rounded overflow-hidden p-0.5 bg-[#171208]">
                  <button
                    onClick={() => setEditTarget("primary")}
                    className={`flex-1 py-1 text-[8px] font-bold uppercase cursor-pointer rounded transition-all ${
                      editTarget === "primary" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Primary / Body Text
                  </button>
                  <button
                    onClick={() => setEditTarget("secondary")}
                    className={`flex-1 py-1 text-[8px] font-bold uppercase cursor-pointer rounded transition-all ${
                      editTarget === "secondary" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Hero / Highlight Word
                  </button>
                </div>
              </div>
            )}

            {/* FONT CONFIG */}
            <div className="space-y-3.5 border-b border-[#3B301C]/50 pb-4">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#DCC8A4]">Font & Typography</span>
              
              {editTarget === "primary" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Font Family</label>
                      <select
                        value={customFont}
                        onChange={(e) => {
                          setCustomFont(e.target.value);
                          saveStyleImmediate({ font: e.target.value });
                        }}
                        className="w-full bg-[#281F10] border border-[#3B301C] text-[10px] rounded p-1.5 focus:outline-none focus:border-[#DCC8A4] cursor-pointer text-white"
                      >
                        {POPULAR_FONTS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Font Style</label>
                      <select
                        value={customFontFace}
                        onChange={(e) => {
                          setCustomFontFace(e.target.value);
                          saveStyleImmediate({ fontFace: e.target.value });
                        }}
                        className="w-full bg-[#281F10] border border-[#3B301C] text-[10px] rounded p-1.5 focus:outline-none focus:border-[#DCC8A4] cursor-pointer text-white"
                      >
                        {["Thin", "Extra Light", "Light", "Regular", "Medium", "Semi Bold", "Bold", "Extra Bold", "Black"].map((style) => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                      <span>Font Size</span>
                      <span className="font-mono text-[#DCC8A4]">{customSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="96"
                      value={customSize}
                      onChange={(e) => {
                        setCustomSize(parseInt(e.target.value, 10));
                        saveStyleBackground({ size: parseInt(e.target.value, 10) });
                      }}
                      className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Hero Word Config Panel */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Hero Font</label>
                      <select
                        value={heroFont}
                        onChange={(e) => {
                          setHeroFont(e.target.value);
                          saveStyleImmediate({ keyword_font: e.target.value || null });
                        }}
                        className="w-full bg-[#281F10] border border-[#3B301C] text-[10px] rounded p-1.5 focus:outline-none focus:border-[#DCC8A4] cursor-pointer text-white"
                      >
                        <option value="">(Inherit Base Font)</option>
                        {POPULAR_FONTS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Hero Weight</label>
                      <select
                        value={heroFontFace}
                        onChange={(e) => {
                          setHeroFontFace(e.target.value);
                          saveStyleImmediate({ heroFontFace: e.target.value });
                        }}
                        className="w-full bg-[#281F10] border border-[#3B301C] text-[10px] rounded p-1.5 focus:outline-none focus:border-[#DCC8A4] cursor-pointer text-white"
                      >
                        <option value="Template default">Template default</option>
                        {["Thin", "Extra Light", "Light", "Regular", "Medium", "Semi Bold", "Bold", "Extra Bold", "Black"].map((style) => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                      <span>Hero Size Scale</span>
                      <span className="font-mono text-[#DCC8A4]">{heroSizeScale}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={heroSizeScale}
                      onChange={(e) => {
                        setHeroSizeScale(parseFloat(e.target.value));
                        saveStyleBackground({ keyword_size_scale: parseFloat(e.target.value) });
                      }}
                      className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                    />
                  </div>
                </>
              )}
            </div>

            {/* FORMAT OPTIONS */}
            <div className="space-y-3.5 border-b border-[#3B301C]/50 pb-4">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#DCC8A4]">Format & Case</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Casing</label>
                  <select
                    value={customCasing}
                    onChange={(e) => {
                      setCustomCasing(e.target.value as any);
                      saveStyleImmediate({ text_transform: e.target.value });
                    }}
                    className="w-full bg-[#281F10] border border-[#3B301C] text-[10px] rounded p-1.5 focus:outline-none focus:border-[#DCC8A4] cursor-pointer text-white"
                  >
                    <option value="none">As Transcribed</option>
                    <option value="uppercase">ALL CAPS</option>
                    <option value="lowercase">all lowercase</option>
                    <option value="capitalize">Capitalize Words</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Alignment</label>
                  <div className="flex border border-[#3B301C] rounded overflow-hidden bg-[#171208] p-0.5">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => {
                          setCustomAlignment(align);
                          saveStyleImmediate({ alignment: align });
                        }}
                        className={`flex-1 py-1 text-[8px] font-bold uppercase cursor-pointer rounded transition-all ${
                          customAlignment === align ? "bg-[#DCC8A4] text-[#171208]" : "text-white/60 hover:text-white"
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Underline Switch */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white">Underline</span>
                  <span className="text-[7px] text-white/40 uppercase tracking-wider">Draw continuous underline</span>
                </div>
                <button
                  onClick={() => {
                    setCustomUnderline(!customUnderline);
                    saveStyleImmediate({ underline: !customUnderline });
                  }}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    customUnderline ? "bg-[#DCC8A4]" : "bg-[#3B301C]"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                      customUnderline ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* COLOR CONFIG */}
            <div className="space-y-3.5 border-b border-[#3B301C]/50 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#DCC8A4]">Colors & Fill Mode</span>
                
                <div className="flex bg-[#171208] border border-[#3B301C] p-0.5 rounded-full">
                  <button
                    onClick={() => {
                      setCustomColorMode("solid");
                      saveStyleImmediate({ color_mode: "solid" });
                    }}
                    className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase transition-all cursor-pointer ${
                      customColorMode === "solid" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Solid
                  </button>
                  <button
                    onClick={() => {
                      setCustomColorMode("gradient");
                      saveStyleImmediate({ color_mode: "gradient" });
                    }}
                    className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase transition-all cursor-pointer ${
                      customColorMode === "gradient" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Gradient
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 items-end">
                <div className="space-y-1">
                  <label className="block text-[7px] font-bold uppercase tracking-wider text-white/40">Body Color</label>
                  <div className="flex gap-1.5 items-center bg-[#281F10] border border-[#3B301C] p-1 rounded">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        saveStyleBackground({ color: e.target.value });
                      }}
                      className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-[8px] font-mono uppercase text-white/80">{customColor.replace("#", "")}</span>
                  </div>
                </div>

                {customColorMode === "gradient" && (
                  <div className="space-y-1">
                    <label className="block text-[7px] font-bold uppercase tracking-wider text-white/40">Gradient Color 2</label>
                    <div className="flex gap-1.5 items-center bg-[#281F10] border border-[#3B301C] p-1 rounded">
                      <input
                        type="color"
                        value={customColor2}
                        onChange={(e) => {
                          setCustomColor2(e.target.value);
                          saveStyleBackground({ color2: e.target.value });
                        }}
                        className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                      />
                      <span className="text-[8px] font-mono uppercase text-white/80">{customColor2.replace("#", "")}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[7px] font-bold uppercase tracking-wider text-white/40">Highlight Color</label>
                  <div className="flex gap-1.5 items-center bg-[#281F10] border border-[#3B301C] p-1 rounded">
                    <input
                      type="color"
                      value={customHighlightColor}
                      onChange={(e) => {
                        setCustomHighlightColor(e.target.value);
                        saveStyleBackground({ highlight_color: e.target.value });
                      }}
                      className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-[8px] font-mono uppercase text-white/80">{customHighlightColor.replace("#", "")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* POSITION & BOUNDING BOX */}
            <div className="space-y-3.5 border-b border-[#3B301C]/50 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#DCC8A4]">Layout Position & Box</span>
                
                <button
                  onClick={() => setBoxEditMode(!boxEditMode)}
                  className={`text-[8px] font-bold uppercase border px-2 py-0.5 rounded transition-all cursor-pointer ${
                    boxEditMode ? "bg-[#DCC8A4] text-[#171208] border-[#DCC8A4]" : "border-[#3B301C] text-white/60 hover:text-white"
                  }`}
                >
                  {boxEditMode ? "Exit Box Edit" : "Edit Safe Box"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                    <span>Vertical position</span>
                    <span className="font-mono text-[#DCC8A4]">{customYPositionPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="0.5"
                    value={customYPositionPercent}
                    onChange={(e) => {
                      setCustomYPositionPercent(parseFloat(e.target.value));
                      saveStyleBackground({ y_position_percent: parseFloat(e.target.value) });
                    }}
                    className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                    <span>Horizontal position</span>
                    <span className="font-mono text-[#DCC8A4]">{customXPositionPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="1"
                    value={customXPositionPercent}
                    onChange={(e) => {
                      setCustomXPositionPercent(parseInt(e.target.value, 10));
                      saveStyleBackground({ x_position_percent: parseInt(e.target.value, 10) });
                    }}
                    className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                  />
                </div>
              </div>
            </div>

            {/* SPACINGS */}
            <div className="space-y-3.5 border-b border-[#3B301C]/50 pb-4">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#DCC8A4]">Spacing Adjustments</span>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                    <span>Letter</span>
                    <span className="font-mono text-[#DCC8A4]">{customLetterSpacing}</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="16"
                    value={customLetterSpacing}
                    onChange={(e) => {
                      setCustomLetterSpacing(parseInt(e.target.value, 10));
                      saveStyleBackground({ letter_spacing: parseInt(e.target.value, 10) });
                    }}
                    className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                    <span>Word</span>
                    <span className="font-mono text-[#DCC8A4]">{customWordSpacing}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={customWordSpacing}
                    onChange={(e) => {
                      setCustomWordSpacing(parseInt(e.target.value, 10));
                      saveStyleBackground({ word_spacing: parseInt(e.target.value, 10) });
                    }}
                    className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                    <span>Line Gap</span>
                    <span className="font-mono text-[#DCC8A4]">{customLineSpacing}</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={customLineSpacing}
                    onChange={(e) => {
                      setCustomLineSpacing(parseFloat(e.target.value));
                      saveStyleBackground({ line_spacing: parseFloat(e.target.value) });
                    }}
                    className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                  />
                </div>
              </div>
            </div>

            {/* MOTION PANEL — how cards enter and how the live word reacts */}
            <div className="space-y-3.5 pb-2">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#DCC8A4]">Motion</span>
              {TEMPLATE_LOCK_HINTS[customCaptionTemplate] && (
                <p className="text-[8px] leading-relaxed text-white/40 bg-[#281F10]/40 border border-[#3B301C] rounded p-2">
                  {TEMPLATE_LOCK_HINTS[customCaptionTemplate]}
                </p>
              )}

              <div className="space-y-1">
                <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Caption Entrance</label>
                <div className="grid grid-cols-4 border border-[#3B301C] rounded overflow-hidden bg-[#171208] p-0.5 gap-0.5">
                  {(["rise", "pop", "fade", "none"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setCustomEntranceAnim(mode);
                        saveStyleBackground({ entrance_anim: mode });
                      }}
                      className={`py-1 text-[8px] font-bold uppercase cursor-pointer rounded transition-all ${
                        customEntranceAnim === mode ? "bg-[#DCC8A4] text-[#171208]" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Spoken-Word Highlight</label>
                <div className="grid grid-cols-4 border border-[#3B301C] rounded overflow-hidden bg-[#171208] p-0.5 gap-0.5">
                  {(["pop", "flash", "underline", "glow"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setCustomHighlightAnim(mode);
                        saveStyleBackground({ highlight_anim: mode });
                      }}
                      className={`py-1 text-[8px] font-bold uppercase cursor-pointer rounded transition-all ${
                        customHighlightAnim === mode ? "bg-[#DCC8A4] text-[#171208]" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* EFFECTS PANEL (SHADOW, OUTLINE, BACKING BOX) */}
            <div className="space-y-3.5 pb-2">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#DCC8A4]">Text Effects</span>
              
              {/* Shadow Switch */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white">Drop Shadow</span>
                  <span className="text-[7px] text-white/40 uppercase tracking-wider">Draws dark backing shadow</span>
                </div>
                <button
                  onClick={() => {
                    setShadowEnabled(!shadowEnabled);
                    saveStyleImmediate({ shadowEnabled: !shadowEnabled });
                  }}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    shadowEnabled ? "bg-[#DCC8A4]" : "bg-[#3B301C]"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                      shadowEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {shadowEnabled && (
                <div className="bg-[#281F10]/30 p-2.5 border border-[#3B301C] rounded space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                      <span>Shadow Blur Depth</span>
                      <span className="font-mono text-[#DCC8A4]">{customShadow}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={customShadow}
                      onChange={(e) => {
                        setCustomShadow(parseFloat(e.target.value));
                        saveStyleBackground({ shadow: parseFloat(e.target.value) });
                      }}
                      className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-bold uppercase tracking-wider text-white/60">Shadow Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={customShadowColor}
                        onChange={(e) => {
                          setCustomShadowColor(e.target.value);
                          saveStyleBackground({ shadow_color: e.target.value });
                        }}
                        className="w-6 h-5 rounded cursor-pointer bg-transparent border border-[#3B301C]"
                      />
                      <span className="font-mono text-[8px] text-[#DCC8A4]">{customShadowColor.replace("#", "").toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stroke / Outline Switch */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white">Text Outline / Border</span>
                  <span className="text-[7px] text-white/40 uppercase tracking-wider">Outer legibility border</span>
                </div>
                <button
                  onClick={() => {
                    setStrokeEnabled(!strokeEnabled);
                    saveStyleImmediate({ strokeEnabled: !strokeEnabled });
                  }}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    strokeEnabled ? "bg-[#DCC8A4]" : "bg-[#3B301C]"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                      strokeEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {strokeEnabled && (
                <div className="bg-[#281F10]/30 p-2.5 border border-[#3B301C] rounded space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-wider text-white/60">
                      <span>Stroke Thickness</span>
                      <span className="font-mono text-[#DCC8A4]">{customOutline}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={customOutline}
                      onChange={(e) => {
                        setCustomOutline(parseFloat(e.target.value));
                        saveStyleBackground({ outline: parseFloat(e.target.value) });
                      }}
                      className="w-full h-1 bg-[#3B301C] rounded-lg appearance-none cursor-pointer accent-[#DCC8A4]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-bold uppercase tracking-wider text-white/60">Stroke Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={customOutlineColor}
                        onChange={(e) => {
                          setCustomOutlineColor(e.target.value);
                          saveStyleBackground({ outline_color: e.target.value });
                        }}
                        className="w-6 h-5 rounded cursor-pointer bg-transparent border border-[#3B301C]"
                      />
                      <span className="font-mono text-[8px] text-[#DCC8A4]">{customOutlineColor.replace("#", "").toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Background Box Switch */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white">Background Box</span>
                  <span className="text-[7px] text-white/40 uppercase tracking-wider">Highlight backing container</span>
                </div>
                <button
                  onClick={() => {
                    setBackgroundEnabled(!backgroundEnabled);
                    saveStyleImmediate({ backgroundEnabled: !backgroundEnabled });
                  }}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    backgroundEnabled ? "bg-[#DCC8A4]" : "bg-[#3B301C]"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                      backgroundEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {backgroundEnabled && (
                <div className="bg-[#281F10]/30 p-2.5 border border-[#3B301C] rounded space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Box Type</label>
                    <div className="flex border border-[#3B301C] rounded overflow-hidden bg-[#171208] p-0.5">
                      <button
                        onClick={() => {
                          setSelectedBackgroundStyle("pill");
                          saveStyleImmediate({ backgroundStyle: "pill" });
                        }}
                        className={`flex-1 py-1 text-[8px] font-bold cursor-pointer rounded transition-all ${
                          selectedBackgroundStyle === "pill" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/70 hover:text-white"
                        }`}
                      >
                        Pill
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBackgroundStyle("shadow-box");
                          saveStyleImmediate({ backgroundStyle: "shadow-box" });
                        }}
                        className={`flex-1 py-1 text-[8px] font-bold cursor-pointer rounded transition-all ${
                          selectedBackgroundStyle === "shadow-box" ? "bg-[#DCC8A4] text-[#171208]" : "text-white/70 hover:text-white"
                        }`}
                      >
                        Shadow Box
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          // TEMPLATES TAB CONTENT
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const groupedPresets = [...TRENDING_TEMPLATE_PRESETS, ...BUILTIN_TEMPLATE_PRESETS];
                return groupedPresets.map((tpl, presetIdx) => {
                  const isSelected = expandedTemplateId === tpl.id;
                  const sectionHeader =
                    presetIdx === 0
                      ? "Trending"
                      : presetIdx === TRENDING_TEMPLATE_PRESETS.length
                      ? "Built-in"
                      : null;

                  return (
                    <React.Fragment key={tpl.id}>
                      {sectionHeader && (
                        <div className={`col-span-2 pb-1 border-b border-[#3B301C]/50 ${presetIdx === 0 ? "" : "pt-2"}`}>
                          <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                            {sectionHeader}
                          </span>
                        </div>
                      )}
                      <div
                        className={`border rounded p-2.5 transition-all duration-200 ${isSelected ? "col-span-2" : ""} ${
                          isSelected ? "border-[#DCC8A4] bg-[#281F10]" : "border-[#3B301C] bg-[#1E170D] hover:border-white/20"
                        }`}
                      >
                        <button
                          onClick={() => handleTemplateClick(tpl.id)}
                          className="w-full text-left flex flex-col justify-between cursor-pointer focus:outline-none"
                        >
                          <TemplateSwatch preset={tpl} />
                          <div className="flex justify-between items-start w-full mt-2">
                            <span className="text-[11px] font-sora font-black uppercase text-white tracking-wide block">
                              {tpl.name}
                            </span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-[#DCC8A4] shrink-0 mt-0.5" />
                            )}
                          </div>
                          <span className="text-[9px] text-white/50 uppercase tracking-wide leading-relaxed block mt-1">
                            {tpl.desc}
                          </span>
                        </button>

                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-[#3B301C] flex items-center justify-between">
                            <span className="text-[8px] text-white/50 uppercase tracking-wide">Applied — fine-tune styling in the Text Settings tab</span>
                            <button
                              onClick={() => setActiveTab("text")}
                              className="text-[8px] font-bold uppercase tracking-wider text-[#DCC8A4] hover:text-white cursor-pointer whitespace-nowrap ml-2"
                            >
                              Edit Style →
                            </button>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Sync Button & Style Save Status */}
      <div className="p-4 border-t border-[#3B301C] bg-[#1A140B] shrink-0">
        <button
          onClick={() => saveStyleImmediate()}
          className="w-full bg-[#DCC8A4] text-[#171208] font-sora font-black uppercase text-[10px] tracking-wider py-2.5 rounded transition-all cursor-pointer text-center hover:bg-[#C9AF83]"
        >
          Sync Settings
        </button>

        {styleError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] uppercase font-bold tracking-wider p-2 mt-2 rounded">
            {styleError}
          </div>
        )}
      </div>
    </section>
  );
};
