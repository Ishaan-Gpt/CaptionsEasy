import React from "react";
import { useCurrentFrame, useVideoConfig, spring, getInputProps } from "remotion";
import { ensureFontsLoaded } from "./fonts";
import { fitFontSizePx, lightenHex, darkenHex } from "./textFit";

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
  };
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
  // templates only — cinematic_emerald's hero uses its OWN start time, see
  // below, precisely to avoid the bug this caused there).
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
  // needs to shrink instead of overflowing the safe area.
  const maxWidthPx = Math.min(width * 0.9, 800);

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

  if (template === "cinematic_emerald") {
    // The hero word must be FIXED for the whole caption card — it's
    // whichever highlight event was authored with is_keyword=true, not
    // "whichever word happens to be active right now". Using the
    // currently-active highlight's index as the split point (the old bug)
    // re-picked a different hero word every time a new word lit up, so the
    // 3-word layout completely reshuffled itself 3 times per card instead
    // of building up naturally — the "stitched together" look.
    const cardHighlights = (timeline as TimelineEvent[]).filter(
      (evt: TimelineEvent) =>
        evt.type === "highlight" &&
        evt.start_ms >= activeCaption.start_ms &&
        evt.end_ms <= activeCaption.end_ms
    );
    const heroEvent = cardHighlights.find((h) => h.payload.is_keyword);
    const heroIndex = heroEvent?.payload.indices?.[0] ?? -1;
    // Progressive reveal: words join the sentence as their own highlight
    // becomes active (mirrors the ASS exporter's `revealed_max` — words
    // fall into place as they're spoken instead of the whole card being
    // visible from frame one).
    const revealedMax = highlightedIndex;

    // "Parrot green" glow by default — a bright, saturated yellow-green
    // rather than the deep emerald — but still respects the project's own
    // chosen highlight color if the user customizes it away from the
    // template's default, same as every other template.
    const highlightColor = activeHighlight?.payload.color ?? heroEvent?.payload.color ?? "#8CFF3E";
    const glossLight = lightenHex(highlightColor, 0.45);
    const glossDark = darkenHex(highlightColor, 0.3);

    // The hero word's pop-in must be keyed to the HERO'S OWN highlight
    // start time — not "whichever word is currently active" (the old
    // `activeWordSpring`/`elapsedHighlightFrames`, which is recomputed off
    // activeHighlight and therefore resets to 0 every time ANY word in the
    // card lights up). That bug replayed the hero's entrance animation
    // once per word in the card, which read as the whole card
    // "reappearing" 2-3 times. A one-shot spring off the hero's own
    // start_ms fires exactly once, instantly, and never retriggers.
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

    const line1Text = line1Words.filter((_, idx) => idx <= revealedMax).join(" ");
    const line3Text = line3Words.filter((_, idx) => heroIndex + 1 + idx <= revealedMax).join(" ");
    const hasHero = heroIndex <= revealedMax;

    // Fit against the card's FULL final text, not just what's currently
    // revealed — sizes are set once and words simply fill in, instead of
    // the whole block resizing/jittering as each new word appears.
    const line1Size = fitFontSizePx(size * 1.1, line1Words.join(" "), maxWidthPx);
    const line3Size = fitFontSizePx(size * 1.1, line3Words.join(" "), maxWidthPx);
    const heroSizeRaw = size * 2.3;
    const heroSize = fitFontSizePx(heroSizeRaw, line2Text, maxWidthPx * 1.05);

    // One instant, one-shot pop keyed to the hero's own start time (see
    // heroPopSpring above) — no per-letter stagger, no re-trigger.
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

          {line1Text && (
            <div
              style={{
                fontFamily: font,
                fontSize: `${line1Size}px`,
                fontWeight: weight,
                color: "#FFFFFF",
                textShadow: baseBevelShadow(highlightColor),
                zIndex: 1,
                marginBottom: "-12px",
                textAlign: "center",
              }}
            >
              {line1Text}
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

          {line3Text && (
            <div
              style={{
                fontFamily: font,
                fontSize: `${line3Size}px`,
                fontWeight: weight,
                color: "#FFFFFF",
                textShadow: baseBevelShadow(highlightColor),
                zIndex: 1,
                marginTop: "-12px",
                textAlign: "center",
              }}
            >
              {line3Text}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div
        className="caption-content-wrapper"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
          gap: "10px 16px",
          width: "90%",
          maxWidth: "800px",
          fontFamily: font,
          fontWeight: weight,
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
          let wordTextShadow = "none";
          let textDecoration = "none";

          // Active Word Spring scaling and rotation
          if (isActive) {
            wordColor = activeHighlight?.payload.color ?? "#FFEA00";
            const scale = 1 + (activeWordSpring - 1) * 0.25; // Scale up to 1.25x
            wordTransform = `scale(${scale})`;

            if (isKeyword) {
              wordRotate = "-4deg"; // Rotate active hero word slightly
              wordWeight = activeHighlight?.payload.weight ?? "900";
              const scaleFactor = activeHighlight?.payload.size_scale ?? 1.3;
              wordSize = size * scaleFactor;
            }
          }

          // Bounding-box fit: a single scaled-up keyword is the most likely
          // thing to overflow the safe area — shrink it back down to fit
          // rather than letting it spill past the container.
          wordSize = fitFontSizePx(wordSize, word, maxWidthPx);

          // Template styling overrides
          const isGlowStack = template === "glow_stack";
          const isCartoonStack = template === "cartoon_stack";
          const isSerifPop = template === "serif_pop";

          if (isGlowStack) {
            if (isActive) {
              wordTextShadow = `0 0 10px ${wordColor}, 0 0 20px ${wordColor}`;
            } else {
              wordTextShadow = "0 0 5px rgba(255, 255, 255, 0.3)";
            }
          }

          if (isCartoonStack) {
            // High contrast text borders using standard text shadow hacks
            wordTextShadow = "3px 3px 0px #000000, -3px -3px 0px #000000, 3px -3px 0px #000000, -3px 3px 0px #000000";
          }

          if (isSerifPop) {
            wordWeight = "400"; // Elegant serif weight
            textDecoration = "italic";
          }

          return (
            <span
              key={`${idx}-${word}`}
              style={{
                display: "inline-block",
                color: wordColor,
                fontSize: `${wordSize}px`,
                fontWeight: wordWeight,
                fontStyle: isSerifPop ? "italic" : "normal",
                transform: `${wordTransform} rotate(${wordRotate})`,
                textShadow: wordTextShadow,
                textDecoration: textDecoration,
                transition: "color 0.15s ease, text-shadow 0.15s ease",
                padding: "2px 4px",
                position: "relative",
              }}
            >
              {word}
              {/* Serif Pop dynamic dot suffix */}
              {isSerifPop && isActive && isKeyword && (
                <span
                  style={{
                    position: "absolute",
                    right: "-8px",
                    bottom: "10px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: wordColor,
                    transform: `scale(${activeWordSpring})`,
                  }}
                />
              )}
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
