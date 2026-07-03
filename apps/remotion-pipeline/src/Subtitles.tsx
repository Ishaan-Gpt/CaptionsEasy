import React from "react";
import { useCurrentFrame, useVideoConfig, spring, getInputProps } from "remotion";
import { ensureFontsLoaded } from "./fonts";
import { fitFontSizePx, estimateTextWidthPx, lightenHex, darkenHex } from "./textFit";

export interface TimelineEvent {
  id: string;
  start_ms: number;
  end_ms: number;
  layer: string;
  type: "caption" | "highlight";
  payload: {
    text?: string;
    font?: string;
    size?: number;
    weight?: string;
    color?: string;
    alignment?: string;
    animation?: string;
    indices?: number[];
    is_keyword?: boolean;
    size_scale?: number;
    background_style?: string;
    y_position_percent?: number;
    // Baked in by DummyRenderPlanProvider.plan() from the style preset
    // (packages/contracts/python/render_plan.py's CaptionPayload) — used
    // by the generic template branch only; the 5 templates with their own
    // dedicated layout keep their signature hardcoded looks.
    text_transform?: string;
    underline?: boolean;
    letter_spacing?: number;
    word_spacing?: number;
    line_spacing?: number;
    color_mode?: string;
    color2?: string | null;
    x_position_percent?: number | null;
    shadow?: number;
    outline?: number;
    // Per-caption-card bounding-box override (Phase C), pixel margins from
    // each canvas edge — same convention as GlobalSettings.safe_area.
    // Resolved server-side (app.api.v1.projects.apply_fragment_overrides)
    // from the project's fragment_overrides_json; undefined/null means
    // "use the project's global safe_area", i.e. the existing 90%/800px
    // fallback this component already had before this field existed.
    box?: { top: number; bottom: number; left: number; right: number } | null;
  };
}

/** Renders a line of words that reveal progressively as they're spoken,
 * WITHOUT ever changing the line's layout: every word is always mounted
 * (reserving its final on-screen slot from frame one), just invisible
 * until its own index is <= revealedMax. Removing not-yet-revealed words
 * from the string instead (array-filter + join) was the earlier bug —
 * the line's rendered width grows as each word is spliced in, which can
 * shift the whole block instead of each word simply appearing in the
 * exact spot it was always going to occupy. Mirrors the frontend preview's
 * `visibility: hidden/visible` per-word convention (page.tsx's glow_stack
 * branch) and the ASS exporter's `revealed_max` windowing.
 *
 * `activeIndex`/`activeColor` are optional: when given, the single word
 * currently being spoken flashes `activeColor` and every other revealed
 * word stays `baseColor` (serif_pop's per-word "pop" — ASS: `if idx ==
 * active_idx: {\c<hl>}word{\c&HFFFFFF&}`). Omit them for templates whose
 * base lines are always a flat color (cinematic_emerald). */
function RevealLine({
  words,
  indexOffset,
  revealedMax,
  baseColor,
  activeIndex,
  activeColor,
}: {
  words: string[];
  indexOffset: number;
  revealedMax: number;
  baseColor: string;
  activeIndex?: number;
  activeColor?: string;
}) {
  return (
    <>
      {words.map((w, i) => {
        const globalIdx = indexOffset + i;
        const isRevealed = globalIdx <= revealedMax;
        const isFlashing = activeColor !== undefined && globalIdx === activeIndex;
        return (
          <span
            key={i}
            style={{
              opacity: isRevealed ? 1 : 0,
              color: isFlashing ? activeColor : baseColor,
              transition: "color 0.1s ease",
            }}
          >
            {i > 0 ? " " : ""}
            {w}
          </span>
        );
      })}
    </>
  );
}

export const Subtitles: React.FC = () => {
  ensureFontsLoaded();
  const { timeline = [], global_settings } = getInputProps() as any;
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  // Find the active caption card
  const activeCaption = (timeline as TimelineEvent[]).find(
    (evt: TimelineEvent) =>
      evt.type === "caption" &&
      currentTimeMs >= evt.start_ms &&
      currentTimeMs <= evt.end_ms
  );

  if (!activeCaption || !activeCaption.payload.text) {
    return null;
  }

  const {
    text,
    font = "Outfit",
    size = 48,
    weight = "800",
    color = "#FFFFFF",
    alignment = "center",
  } = activeCaption.payload;

  // Find the active highlight event overlapping this caption's timeframe
  const activeHighlight = (timeline as TimelineEvent[]).find(
    (evt: TimelineEvent) =>
      evt.type === "highlight" &&
      currentTimeMs >= evt.start_ms &&
      currentTimeMs <= evt.end_ms &&
      evt.start_ms >= activeCaption.start_ms &&
      evt.end_ms <= activeCaption.end_ms
  );

  // Split text by space to render word-by-word
  const rawWords = text.split(/\s+/);
  const highlightedIndex = activeHighlight?.payload.indices?.[0] ?? -1;

  // Spring animation for the active word pop (word_by_word / sentence
  // templates only — cinematic_emerald/serif_pop's hero uses its OWN start
  // time, see below, precisely to avoid the bug this caused there).
  const highlightStartFrame = activeHighlight ? (activeHighlight.start_ms / 1000) * fps : 0;
  const elapsedHighlightFrames = Math.max(0, frame - highlightStartFrame);
  let activeWordSpring = 1;
  if (activeHighlight) {
    activeWordSpring = spring({
      frame: elapsedHighlightFrames,
      fps,
      config: {
        damping: 10,
        stiffness: 120,
        mass: 0.4,
      },
    });
  }

  // Cards cut in/out instantly rather than fading — with highlight windows
  // as short as ~100ms, a 150ms fade was eating the entire on-screen time
  // for a word, which is why text felt like it flashed by unreadably fast.
  // No opacity/scale ramp here at all; the caption's own start_ms/end_ms
  // boundary (the activeCaption lookup above) is the only thing gating
  // visibility now.

  // Bounding box every template renders inside — mirrors the frontend
  // preview and the ASS exporter so all three surfaces agree on when text
  // needs to shrink instead of overflowing the safe area. A per-caption
  // box override (Phase C) takes priority over the default 90%/800px
  // fallback, same priority order as app.render.engine's
  // resolve_box_margins() and the frontend's box-editor state.
  const capBox = activeCaption.payload.box;
  const maxWidthPx = capBox
    ? Math.max(100, width - capBox.left - capBox.right)
    : Math.min(width * 0.9, 800);

  // Renders a stylized container based on the background styles
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: "5%",
    right: "5%",
    top: `${activeCaption.payload.y_position_percent ?? 71.4}%`,
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
    justifyContent: "center",
    textAlign: alignment as any,
  };

  // Determine line/layout templates
  const template = global_settings?.caption_template || "word_by_word";

  // Shared "fixed hero word" resolution — every 3-line template (staggered
  // family) must split around the ONE highlight event authored with
  // is_keyword=true for this card, never around "whichever word is
  // currently active" (that bug reshuffled the whole layout every time a
  // new word lit up — see cinematic_emerald's history).
  const THREE_LINE_TEMPLATES = new Set(["cinematic_emerald", "serif_pop", "cartoon_stack", "glow_stack", "staggered_3line"]);
  const cardHighlights =
    THREE_LINE_TEMPLATES.has(template)
      ? (timeline as TimelineEvent[]).filter(
          (evt: TimelineEvent) =>
            evt.type === "highlight" &&
            evt.start_ms >= activeCaption.start_ms &&
            evt.end_ms <= activeCaption.end_ms
        )
      : [];
  const heroEvent = cardHighlights.find((h) => h.payload.is_keyword);
  const heroIndex = heroEvent?.payload.indices?.[0] ?? -1;
  const revealedMax = highlightedIndex;
  const hasHero = heroIndex !== -1 && heroIndex <= revealedMax;
  // One instant, one-shot pop keyed to the hero's OWN start time — not
  // "whichever word is currently active" (elapsedHighlightFrames above),
  // which resets every time ANY word in the card lights up and replayed
  // the entrance animation 2-3 times per card.
  const heroStartFrame = heroEvent ? (heroEvent.start_ms / 1000) * fps : 0;
  const heroElapsedFrames = Math.max(0, frame - heroStartFrame);
  const heroPopSpring = heroEvent
    ? spring({
        frame: heroElapsedFrames,
        fps,
        config: { damping: 16, stiffness: 260, mass: 0.4 },
        durationInFrames: 4,
      })
    : 1;

  if (template === "cinematic_emerald") {
    // "Parrot green" glow by default — a bright, saturated yellow-green
    // rather than the deep emerald — but still respects the project's own
    // chosen highlight color if the user customizes it away from the
    // template's default, same as every other template.
    const highlightColor = activeHighlight?.payload.color ?? heroEvent?.payload.color ?? "#8CFF3E";
    const glossLight = lightenHex(highlightColor, 0.45);
    const glossDark = darkenHex(highlightColor, 0.3);

    // No genuine hero word authored for this card — render a plain
    // centered block instead of faking an emphasis that was never there.
    if (heroIndex === -1) {
      const plainSize = fitFontSizePx(size * 1.15, text, maxWidthPx);
      return (
        <div style={containerStyle}>
          <div
            style={{
              fontFamily: font,
              fontSize: `${plainSize}px`,
              fontWeight: weight,
              color: "#FFFFFF",
              textShadow: baseBevelShadow(highlightColor),
              width: "90%",
              maxWidth: "800px",
              textAlign: "center",
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    const line1Words = rawWords.slice(0, heroIndex);
    const line3Words = rawWords.slice(heroIndex + 1);
    const line2Text = rawWords[heroIndex] || "";

    // Fit against the card's FULL final text, not just what's currently
    // revealed — sizes are set once and words simply fill in, instead of
    // the whole block resizing/jittering as each new word appears.
    const line1Size = fitFontSizePx(size * 1.1, line1Words.join(" "), maxWidthPx);
    const line3Size = fitFontSizePx(size * 1.1, line3Words.join(" "), maxWidthPx);
    const heroSizeRaw = size * 2.3;
    const heroSize = fitFontSizePx(heroSizeRaw, line2Text, maxWidthPx * 1.05);

    const scale = 0.85 + heroPopSpring * 0.15;

    return (
      <div style={containerStyle}>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "90%",
            maxWidth: "800px",
            lineHeight: "0.8",
          }}
        >
          {/* Soft ambient halo behind the whole stack, matching the
              reference's glow around the hero word */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: `${heroSize * 4}px`,
              height: `${heroSize * 2.2}px`,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(ellipse at center, ${glossLight}66 0%, ${highlightColor}33 45%, transparent 75%)`,
              filter: "blur(18px)",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          {line1Words.length > 0 && (
            <div
              style={{
                fontFamily: font,
                fontSize: `${line1Size}px`,
                fontWeight: weight,
                textShadow: baseBevelShadow(highlightColor),
                zIndex: 1,
                marginBottom: "-12px",
                textAlign: "center",
              }}
            >
              <RevealLine words={line1Words} indexOffset={0} revealedMax={revealedMax} baseColor="#FFFFFF" />
            </div>
          )}

          {hasHero && line2Text && (
            <div style={{ position: "relative", zIndex: 2, marginTop: "-5px", marginBottom: "-5px" }}>
              {/* Blurred glow duplicate sitting behind the crisp hero glyphs —
                  wide/strong blur for the "glowy" parrot-green look. */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  fontFamily: "Playfair Display",
                  fontSize: `${heroSize}px`,
                  fontWeight: 900,
                  fontStyle: "italic",
                  color: highlightColor,
                  textAlign: "center",
                  filter: "blur(20px)",
                  opacity: 0.8,
                  transform: `scale(${scale}) rotate(-4deg)`,
                }}
              >
                {line2Text}
              </div>
              <div
                style={{
                  position: "relative",
                  fontFamily: "Playfair Display",
                  fontSize: `${heroSize}px`,
                  fontWeight: 900,
                  fontStyle: "italic",
                  letterSpacing: "-0.01em",
                  // Glossy vertical gradient fill — dark parrot-green
                  // top-left fading DOWN into a bright light-green
                  // bottom-right, reads as light/glowy overall.
                  background: `linear-gradient(160deg, ${glossDark} 0%, ${highlightColor} 45%, ${glossLight} 100%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  transform: `scale(${scale}) rotate(-4deg)`,
                  textShadow: `
                    0px 8px 25px rgba(0, 0, 0, 0.3),
                    0px 0px 36px ${glossLight}b3,
                    0px 0px 14px ${highlightColor}cc,
                    1px 1px 0px ${glossLight},
                    -1px -1px 0px ${glossDark}
                  `,
                  textAlign: "center",
                  display: "inline-block",
                }}
              >
                {line2Text}
              </div>
            </div>
          )}

          {line3Words.length > 0 && (
            <div
              style={{
                fontFamily: font,
                fontSize: `${line3Size}px`,
                fontWeight: weight,
                textShadow: baseBevelShadow(highlightColor),
                zIndex: 1,
                marginTop: "-12px",
                textAlign: "center",
              }}
            >
              <RevealLine words={line3Words} indexOffset={heroIndex + 1} revealedMax={revealedMax} baseColor="#FFFFFF" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (template === "serif_pop") {
    // Reference look: clean white body lines, currently-spoken word in
    // line1/line3 flashes the highlight color then settles back to white
    // (ASS: `if idx == active_idx: {\c<hl>}word{\c&HFFFFFF&}`) — the hero
    // word itself stays WHITE (not colored/gradient) in a bold brush
    // script, with only a small trailing dot in the highlight color. No
    // glow/blur halo in the reference — kept deliberately plain.
    const highlightColor = activeHighlight?.payload.color ?? heroEvent?.payload.color ?? "#FFEE00";
    const dropShadow = "0px 3px 3px rgba(0,0,0,0.45), 0px 6px 10px rgba(0,0,0,0.35)";

    if (heroIndex === -1) {
      const plainSize = fitFontSizePx(size, text, maxWidthPx);
      return (
        <div style={containerStyle}>
          <div
            style={{
              fontFamily: font,
              fontSize: `${plainSize}px`,
              fontWeight: 900,
              color: "#FFFFFF",
              textShadow: dropShadow,
              width: "90%",
              maxWidth: "800px",
              textAlign: "center",
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    const line1Words = rawWords.slice(0, heroIndex);
    const line3Words = rawWords.slice(heroIndex + 1);
    const line2Text = rawWords[heroIndex] || "";

    const line1Size = fitFontSizePx(size, line1Words.join(" "), maxWidthPx);
    const line3Size = fitFontSizePx(size, line3Words.join(" "), maxWidthPx);
    const heroSizeRaw = size * 1.8;
    const heroSize = fitFontSizePx(heroSizeRaw, `${line2Text}.`, maxWidthPx);
    const scale = 0.9 + heroPopSpring * 0.1;

    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "90%",
            maxWidth: "800px",
            gap: `${size * 0.08}px`,
          }}
        >
          {line1Words.length > 0 && (
            <div
              style={{
                fontFamily: font,
                fontSize: `${line1Size}px`,
                fontWeight: 900,
                textShadow: dropShadow,
                textAlign: "center",
              }}
            >
              <RevealLine
                words={line1Words}
                indexOffset={0}
                revealedMax={revealedMax}
                baseColor="#FFFFFF"
                activeIndex={highlightedIndex}
                activeColor={highlightColor}
              />
            </div>
          )}

          {hasHero && line2Text && (
            <div
              style={{
                fontFamily: "Kaushan Script",
                fontSize: `${heroSize}px`,
                fontWeight: 400,
                color: "#FFFFFF",
                textShadow: dropShadow,
                textAlign: "center",
                transform: `scale(${scale})`,
                lineHeight: 1,
              }}
            >
              {line2Text}
              <span style={{ color: highlightColor }}>.</span>
            </div>
          )}

          {line3Words.length > 0 && (
            <div
              style={{
                fontFamily: font,
                fontSize: `${line3Size}px`,
                fontWeight: 900,
                textShadow: dropShadow,
                textAlign: "center",
              }}
            >
              <RevealLine
                words={line3Words}
                indexOffset={heroIndex + 1}
                revealedMax={revealedMax}
                baseColor="#FFFFFF"
                activeIndex={highlightedIndex}
                activeColor={highlightColor}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (template === "cartoon_stack") {
    // Reference ("jugadu"): tan/cream bubble-letter hero word with a thick
    // dark-brown outline, plain thin black handwritten body lines (no
    // shadow/border on the body — ASS: `\bord0\shad0` for line1/line3,
    // no per-word active-flash unlike serif_pop). -webkit-text-stroke
    // gives a crisp CSS-native thick outline instead of the old 4-shadow
    // border hack the generic word_by_word branch still uses as a
    // fallback for templates without a real Remotion layout.
    const highlightColor = activeHighlight?.payload.color ?? heroEvent?.payload.color ?? "#EDE0A6";
    const borderColor = darkenHex(highlightColor, 0.65);
    const bodyColor = color || "#FFFFFF";

    if (heroIndex === -1) {
      const plainSize = fitFontSizePx(size * 0.8, text, maxWidthPx);
      return (
        <div style={containerStyle}>
          <div
            style={{
              fontFamily: "Caveat",
              fontSize: `${plainSize}px`,
              fontWeight: 700,
              color: bodyColor,
              width: "90%",
              maxWidth: "800px",
              textAlign: "center",
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    const line1Words = rawWords.slice(0, heroIndex);
    const line3Words = rawWords.slice(heroIndex + 1);
    const line2Text = rawWords[heroIndex] || "";

    const bodySizeRaw = size * 0.8;
    const line1Size = fitFontSizePx(bodySizeRaw, line1Words.join(" "), maxWidthPx);
    const line3Size = fitFontSizePx(bodySizeRaw, line3Words.join(" "), maxWidthPx);
    const heroSizeRaw = size * 1.6;
    const heroSize = fitFontSizePx(heroSizeRaw, line2Text, maxWidthPx);
    const scale = 0.92 + heroPopSpring * 0.08;

    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "90%",
            maxWidth: "800px",
            gap: `${size * 0.05}px`,
          }}
        >
          {line1Words.length > 0 && (
            <div
              style={{
                fontFamily: "Caveat",
                fontSize: `${line1Size}px`,
                fontWeight: 700,
                color: bodyColor,
                textAlign: "center",
              }}
            >
              <RevealLine words={line1Words} indexOffset={0} revealedMax={revealedMax} baseColor={bodyColor} />
            </div>
          )}

          {hasHero && line2Text && (
            <div
              style={{
                fontFamily: "Fredoka",
                fontSize: `${heroSize}px`,
                fontWeight: 700,
                color: highlightColor,
                WebkitTextStroke: `${Math.max(4, heroSize * 0.055)}px ${borderColor}`,
                paintOrder: "stroke fill",
                textShadow: `0px 5px 6px rgba(0,0,0,0.45)`,
                textAlign: "center",
                transform: `scale(${scale})`,
                lineHeight: 1,
              }}
            >
              {line2Text}
            </div>
          )}

          {line3Words.length > 0 && (
            <div
              style={{
                fontFamily: "Caveat",
                fontSize: `${line3Size}px`,
                fontWeight: 700,
                color: bodyColor,
                textAlign: "center",
              }}
            >
              <RevealLine words={line3Words} indexOffset={heroIndex + 1} revealedMax={revealedMax} baseColor={bodyColor} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (template === "glow_stack") {
    // Flat deep-blue hero + plain white body, per direct instruction after
    // two gradient/emboss passes didn't land — gradients and text-shadow
    // bevels are fully supported by Remotion (real Chromium under the
    // hood), the issue was calibration, not a rendering limitation. Kept
    // from the earlier passes: splash anchoring (line1 left edge / line3
    // right edge sync to the hero's own edges), tight line spacing, and
    // the larger ~2.3x hero-to-body size ratio — none of those were
    // flagged as wrong.
    const highlightColor = activeHighlight?.payload.color ?? heroEvent?.payload.color ?? "#4FA8FF";

    if (heroIndex === -1) {
      const plainSize = fitFontSizePx(size * 1.2, text, maxWidthPx);
      return (
        <div style={containerStyle}>
          <div
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontSize: `${plainSize}px`,
              fontWeight: 800,
              color: "#FFFFFF",
              textShadow: "0px 3px 6px rgba(0,0,0,0.45)",
              width: "90%",
              maxWidth: "800px",
              textAlign: "center",
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    const line1Words = rawWords.slice(0, heroIndex);
    const line3Words = rawWords.slice(heroIndex + 1);
    const line2Text = (rawWords[heroIndex] || "").toUpperCase();

    const bodySizeRaw = size * 1.2;
    const line1Size = fitFontSizePx(bodySizeRaw, line1Words.join(" "), maxWidthPx);
    const line3Size = fitFontSizePx(bodySizeRaw, line3Words.join(" "), maxWidthPx);
    const heroSizeRaw = size * 2.3;
    const heroSize = fitFontSizePx(heroSizeRaw, line2Text, maxWidthPx);
    const scale = 0.93 + heroPopSpring * 0.07;

    // Splash anchoring: figure out where the hero's own left/right edges
    // land within the fixed-width stack, then pin line1/line3 to those
    // same x-coordinates instead of centering them independently.
    const stackWidth = maxWidthPx;
    const heroWidthPx = Math.min(estimateTextWidthPx(line2Text, heroSize), stackWidth);
    const heroLeftPx = (stackWidth - heroWidthPx) / 2;
    const heroRightPx = stackWidth - heroLeftPx;

    return (
      <div style={containerStyle}>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: `${stackWidth}px`,
            maxWidth: "800px",
          }}
        >
          {/* Soft dark/blue blurred backdrop blob for legibility. */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: `${heroSize * 3.2}px`,
              height: `${(line1Size + heroSize + line3Size) * 0.95}px`,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(ellipse 62% 58% at 50% 50%, rgba(10,16,32,0.55), rgba(10,16,32,0.28) 55%, transparent 78%)",
              filter: "blur(28px)",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          {line1Words.length > 0 && (
            <div style={{ position: "relative", width: "100%", height: `${line1Size * 1.15}px`, zIndex: 1, marginBottom: `${-line1Size * 0.12}px` }}>
              <div
                style={{
                  position: "absolute",
                  left: `${heroLeftPx}px`,
                  top: 0,
                  whiteSpace: "nowrap",
                  fontFamily: "'Baloo 2', sans-serif",
                  fontSize: `${line1Size}px`,
                  fontWeight: 800,
                  textShadow: "0px 3px 6px rgba(0,0,0,0.45)",
                  textAlign: "left",
                }}
              >
                <RevealLine words={line1Words} indexOffset={0} revealedMax={revealedMax} baseColor="#FFFFFF" />
              </div>
            </div>
          )}

          {hasHero && line2Text && (
            <div
              style={{
                position: "relative",
                zIndex: 2,
                fontFamily: "Anton",
                fontSize: `${heroSize}px`,
                fontWeight: 900,
                color: highlightColor,
                textShadow: "0px 4px 8px rgba(0,0,0,0.45)",
                textAlign: "center",
                transform: `scale(${scale})`,
              }}
            >
              {line2Text}
            </div>
          )}

          {line3Words.length > 0 && (
            <div style={{ position: "relative", width: "100%", height: `${line3Size * 1.15}px`, zIndex: 1, marginTop: `${-line3Size * 0.12}px` }}>
              <div
                style={{
                  position: "absolute",
                  right: `${stackWidth - heroRightPx}px`,
                  top: 0,
                  whiteSpace: "nowrap",
                  fontFamily: "'Baloo 2', sans-serif",
                  fontSize: `${line3Size}px`,
                  fontWeight: 800,
                  textShadow: "0px 3px 6px rgba(0,0,0,0.45)",
                  textAlign: "right",
                }}
              >
                <RevealLine words={line3Words} indexOffset={heroIndex + 1} revealedMax={revealedMax} baseColor="#FFFFFF" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (template === "staggered_3line") {
    // Reference ("Hello and / WELCOME / to Kalakaar."): the ASS exporter's
    // own design here is already flat — plain white body (weight 700,
    // thin outline, no shadow/glow), uppercase highlight-color hero (same
    // thin outline treatment, no special effect) — matches the flat style
    // that turned out right for glow_stack, so no gradient/emboss
    // experimentation needed this time. Splash anchoring: same edge-sync
    // algorithm as glow_stack. Normal (positive) line gaps, not the tight
    // overlap cinematic_emerald/glow_stack use — this reference's lines
    // sit at a comfortable, non-overlapping distance.
    const highlightColor = activeHighlight?.payload.color ?? heroEvent?.payload.color ?? "#C5FF00";
    const outlineColor = "#000000";
    // A plain legibility stroke (not a design-defining color, unlike
    // cartoon_stack's bubble border) — safe to let the user's Text-tab
    // outline thickness scale it up/down instead of always fixing it at 2px.
    const outlinePx = activeCaption.payload.outline && activeCaption.payload.outline > 0 ? activeCaption.payload.outline : 2;

    if (heroIndex === -1) {
      const plainSize = fitFontSizePx(size * 1.1, text, maxWidthPx);
      return (
        <div style={containerStyle}>
          <div
            style={{
              fontFamily: font,
              fontSize: `${plainSize}px`,
              fontWeight: 700,
              color: "#FFFFFF",
              WebkitTextStroke: `${outlinePx}px ${outlineColor}`,
              paintOrder: "stroke fill",
              width: "90%",
              maxWidth: "800px",
              textAlign: "center",
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    const line1Words = rawWords.slice(0, heroIndex);
    const line3Words = rawWords.slice(heroIndex + 1);
    const line2Text = (rawWords[heroIndex] || "").toUpperCase();

    const bodySizeRaw = size * 1.1;
    const line1Size = fitFontSizePx(bodySizeRaw, line1Words.join(" "), maxWidthPx);
    const line3Size = fitFontSizePx(bodySizeRaw, line3Words.join(" "), maxWidthPx);
    const heroSizeRaw = size * 1.5;
    const heroSize = fitFontSizePx(heroSizeRaw, line2Text, maxWidthPx);
    const scale = 0.95 + heroPopSpring * 0.05;

    // Splash anchoring, same technique as glow_stack: pin line1's left
    // edge / line3's right edge to the hero's own left/right edges.
    const stackWidth = maxWidthPx;
    const heroWidthPx = Math.min(estimateTextWidthPx(line2Text, heroSize), stackWidth);
    const heroLeftPx = (stackWidth - heroWidthPx) / 2;
    const heroRightPx = stackWidth - heroLeftPx;

    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: `${stackWidth}px`,
            maxWidth: "800px",
            gap: `${size * 0.12}px`,
          }}
        >
          {line1Words.length > 0 && (
            <div style={{ position: "relative", width: "100%", height: `${line1Size * 1.15}px` }}>
              <div
                style={{
                  position: "absolute",
                  left: `${heroLeftPx}px`,
                  top: 0,
                  whiteSpace: "nowrap",
                  fontFamily: font,
                  fontSize: `${line1Size}px`,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  WebkitTextStroke: `${outlinePx}px ${outlineColor}`,
                  paintOrder: "stroke fill",
                  textAlign: "left",
                }}
              >
                <RevealLine words={line1Words} indexOffset={0} revealedMax={revealedMax} baseColor="#FFFFFF" />
              </div>
            </div>
          )}

          {hasHero && line2Text && (
            <div
              style={{
                fontFamily: "Anton",
                fontSize: `${heroSize}px`,
                fontWeight: 900,
                color: highlightColor,
                WebkitTextStroke: `${outlinePx}px ${outlineColor}`,
                paintOrder: "stroke fill",
                textAlign: "center",
                transform: `scale(${scale})`,
              }}
            >
              {line2Text}
            </div>
          )}

          {line3Words.length > 0 && (
            <div style={{ position: "relative", width: "100%", height: `${line3Size * 1.15}px` }}>
              <div
                style={{
                  position: "absolute",
                  right: `${stackWidth - heroRightPx}px`,
                  top: 0,
                  whiteSpace: "nowrap",
                  fontFamily: font,
                  fontSize: `${line3Size}px`,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  WebkitTextStroke: `${outlinePx}px ${outlineColor}`,
                  paintOrder: "stroke fill",
                  textAlign: "right",
                }}
              >
                <RevealLine words={line3Words} indexOffset={heroIndex + 1} revealedMax={revealedMax} baseColor="#FFFFFF" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Generic template (word_by_word / sentence_highlight / sentence_clean —
  // anything without its own dedicated layout above). Previously
  // shadow/outline/casing/underline/spacing/gradient/background-box were
  // either hardcoded per-template guesses (isGlowStack/isCartoonStack —
  // both dead code, since glow_stack/cartoon_stack return from their own
  // branches above and can never reach here) or simply never read from the
  // payload at all — every one of those Text-tab controls was live-preview
  // only. This branch now reads them for real, the same way font/size/
  // color already did.
  const payloadShadow = activeCaption.payload.shadow ?? 0;
  const payloadOutline = activeCaption.payload.outline ?? 0;
  const payloadTextTransform = activeCaption.payload.text_transform ?? "none";
  const payloadUnderline = Boolean(activeCaption.payload.underline);
  const payloadLetterSpacing = activeCaption.payload.letter_spacing ?? 0;
  const payloadWordSpacing = activeCaption.payload.word_spacing ?? 0;
  const payloadLineSpacing = activeCaption.payload.line_spacing ?? 1;
  const payloadColorMode = activeCaption.payload.color_mode ?? "solid";
  const payloadColor2 = activeCaption.payload.color2;
  const payloadBackgroundStyle = activeCaption.payload.background_style ?? "none";
  const payloadXPositionPercent = activeCaption.payload.x_position_percent;

  const baseTextShadow = payloadShadow > 0 ? `0px ${payloadShadow}px ${payloadShadow}px rgba(0,0,0,0.6)` : "none";
  const useGradient = payloadColorMode === "gradient";
  const gradientCss = useGradient
    ? `linear-gradient(135deg, ${color}, ${payloadColor2 || activeHighlight?.payload.color || "#00F5C4"})`
    : undefined;

  const bgPadding = payloadBackgroundStyle === "pill" ? "10px 20px" : payloadBackgroundStyle === "shadow-box" ? "14px 18px" : "0px";
  const bgColor = payloadBackgroundStyle === "pill" ? "rgba(17,19,23,0.85)" : payloadBackgroundStyle === "shadow-box" ? "rgba(17,19,23,0.95)" : "transparent";
  const bgRadius = payloadBackgroundStyle === "pill" ? "9999px" : payloadBackgroundStyle === "shadow-box" ? "8px" : "0px";

  const positionedContainerStyle: React.CSSProperties =
    payloadXPositionPercent != null
      ? { ...containerStyle, left: `${payloadXPositionPercent}%`, right: "auto", transform: `translate(-50%, -50%)`, top: containerStyle.top }
      : containerStyle;

  return (
    <div style={positionedContainerStyle}>
      <div
        className="caption-content-wrapper"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
          gap: "10px 16px",
          width: capBox ? `${maxWidthPx}px` : "90%",
          maxWidth: capBox ? `${maxWidthPx}px` : "800px",
          fontFamily: font,
          fontWeight: weight,
          lineHeight: payloadLineSpacing,
          wordSpacing: `${payloadWordSpacing}px`,
          padding: bgPadding,
          backgroundColor: bgColor,
          borderRadius: bgRadius,
        }}
      >
        {rawWords.map((word: string, idx: number) => {
          const isActive = idx === highlightedIndex;
          const isKeyword = isActive && activeHighlight?.payload.is_keyword;

          // Compute font styling for this specific word
          let wordColor = color;
          let wordSize = size;
          let wordWeight = weight;
          let wordTransform = "scale(1)";
          let wordRotate = "0deg";

          // Active Word Spring scaling and rotation. The keyword's "bigger"
          // look is applied ONLY via CSS transform:scale, never by changing
          // fontSize — fontSize affects real layout, so bumping it every
          // time a different word becomes active reflowed the entire row
          // (and, after Phase A, visibly resized/shifted the new pill
          // background box along with it) once per word — reading exactly
          // like the whole card regenerating. transform:scale is purely
          // visual and doesn't reserve extra layout space, so neighboring
          // words stay exactly where they always were.
          if (isActive) {
            wordColor = activeHighlight?.payload.color ?? "#FFEA00";
            const popScale = 1 + (activeWordSpring - 1) * 0.25; // up to 1.25x
            let totalScale = popScale;

            if (isKeyword) {
              wordRotate = "-4deg"; // Rotate active hero word slightly
              wordWeight = activeHighlight?.payload.weight ?? "900";
              const scaleFactor = activeHighlight?.payload.size_scale ?? 1.3;
              totalScale = popScale * scaleFactor;
            }
            wordTransform = `scale(${totalScale})`;
          }

          // Bounding-box fit: a single scaled-up keyword is the most likely
          // thing to overflow the safe area — shrink it back down to fit
          // rather than letting it spill past the container.
          wordSize = fitFontSizePx(wordSize, word, maxWidthPx);

          // Gradient only applies to non-active words — the active/
          // highlighted word keeps its flat highlight color, same as every
          // other template's "pop" signature.
          const wordStyle: React.CSSProperties = {
            display: "inline-block",
            fontSize: `${wordSize}px`,
            fontWeight: wordWeight,
            transform: `${wordTransform} rotate(${wordRotate})`,
            textShadow: baseTextShadow,
            textDecoration: payloadUnderline ? "underline" : "none",
            textTransform: payloadTextTransform as any,
            letterSpacing: `${payloadLetterSpacing}px`,
            WebkitTextStroke: payloadOutline > 0 ? `${payloadOutline * 0.5}px ${isActive ? wordColor : "#000000"}` : undefined,
            transition: "color 0.15s ease, text-shadow 0.15s ease",
            padding: "2px 4px",
            position: "relative",
          };
          if (useGradient && !isActive) {
            wordStyle.backgroundImage = gradientCss;
            wordStyle.WebkitBackgroundClip = "text";
            wordStyle.backgroundClip = "text";
            wordStyle.color = "transparent";
          } else {
            wordStyle.color = wordColor;
          }

          return (
            <span key={`${idx}-${word}`} style={wordStyle}>
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Subtle raised-white-plastic bevel used by cinematic_emerald's base
 * (non-hero) lines: light rim on top, dark grounding shadow below, plus a
 * faint tint of the hero color so the two tiers read as one family. */
function baseBevelShadow(accentColor: string): string {
  return `
    0px 1px 0px rgba(255, 255, 255, 0.55),
    0px -1px 0px rgba(0, 0, 0, 0.18),
    0px 6px 16px rgba(0, 0, 0, 0.4),
    0px 0px 20px ${accentColor}40
  `;
}
