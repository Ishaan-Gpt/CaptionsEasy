import { continueRender, delayRender, staticFile } from "remotion";

export interface ProductionFontDef {
  family: string;
  file: string;
  weight: string;
  style?: "normal" | "italic";
}

/** The exact font set `apps/remotion-pipeline/src/fonts.ts` registers for
 * production caption rendering (same .ttf files, copied into this app's
 * `public/fonts/`) — the /test pages preview typography with the real fonts
 * CaptionsEasy ships, not an arbitrary Google Fonts catalog. */
export const PRODUCTION_FONTS: ProductionFontDef[] = [
  { family: "Outfit", file: "fonts/Outfit-Regular.ttf", weight: "400" },
  { family: "Outfit", file: "fonts/Outfit-Bold.ttf", weight: "700" },
  { family: "Outfit", file: "fonts/Outfit-ExtraBold.ttf", weight: "800" },
  { family: "Outfit", file: "fonts/Outfit-Black.ttf", weight: "900" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-Regular.ttf", weight: "400", style: "normal" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-Bold.ttf", weight: "700", style: "normal" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-Black.ttf", weight: "900", style: "normal" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-Italic.ttf", weight: "400", style: "italic" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-BoldItalic.ttf", weight: "700", style: "italic" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-BlackItalic.ttf", weight: "900", style: "italic" },
  { family: "Anton", file: "fonts/Anton-Regular.ttf", weight: "400" },
  { family: "Baloo 2", file: "fonts/Baloo2-Regular.ttf", weight: "400" },
  { family: "Baloo 2", file: "fonts/Baloo2-Bold.ttf", weight: "700" },
  { family: "Baloo 2", file: "fonts/Baloo2-ExtraBold.ttf", weight: "800" },
  { family: "Fredoka", file: "fonts/Fredoka-Regular.ttf", weight: "400" },
  { family: "Fredoka", file: "fonts/Fredoka-Bold.ttf", weight: "700" },
  { family: "Caveat", file: "fonts/Caveat-Regular.ttf", weight: "400" },
  { family: "Caveat", file: "fonts/Caveat-Bold.ttf", weight: "700" },
  { family: "Kaushan Script", file: "fonts/KaushanScript-Regular.ttf", weight: "400" },
];

export const PRODUCTION_FONT_FAMILIES = Array.from(new Set(PRODUCTION_FONTS.map((f) => f.family)));

/** Maps a family to the template that uses it in `Subtitles.tsx`, so the
 * typography page's font picker can say *why* each font is in this list. */
export const FONT_PRODUCTION_USAGE: Record<string, string> = {
  Outfit: "Default body font (word_by_word / generic template)",
  "Playfair Display": "cinematic_emerald hero word (Subtitles.tsx:279)",
  Anton: "glow_stack / staggered_3line hero word default",
  "Baloo 2": "glow_stack body lines (Subtitles.tsx:652,726)",
  Fredoka: "cartoon_stack hero word default (Subtitles.tsx:566)",
  Caveat: "cartoon_stack body lines (Subtitles.tsx:544,587,620)",
  "Kaushan Script": "serif_pop hero word default (Subtitles.tsx:444)",
};

let loadPromise: Promise<void> | null = null;

/** Same FontFace-registration pattern as `apps/remotion-pipeline/src/fonts.ts`'s
 * `ensureFontsLoaded` — must run from the component body so the
 * `delayRender()` handle exists before Remotion's first paint. */
export const ensureProductionFontsLoaded = (): void => {
  if (loadPromise || typeof document === "undefined") return;

  const handle = delayRender("Loading production caption fonts");
  loadPromise = Promise.all(
    PRODUCTION_FONTS.map((f) =>
      new FontFace(f.family, `url(${staticFile(f.file)})`, {
        weight: f.weight,
        style: f.style ?? "normal",
      })
        .load()
        .then((face) => {
          (document.fonts as FontFaceSet).add(face);
        })
        .catch((err) => {
          console.error(`Failed to load font ${f.family} (${f.file})`, err);
        })
    )
  ).then(() => undefined);

  loadPromise.finally(() => continueRender(handle));
};
