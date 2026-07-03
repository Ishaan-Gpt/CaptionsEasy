import { continueRender, delayRender, staticFile } from "remotion";

interface FontDef {
  family: string;
  file: string;
  weight?: string;
  style?: string;
}

// Matches the family/weight/style combinations Subtitles.tsx actually sets
// via inline styles. Chromium (Remotion's render target) resolves the right
// face for a given font-weight/font-style pair as long as every combination
// used in CSS has a matching FontFace registered here — otherwise it silently
// falls back to a system font, which is why templates like cinematic_emerald
// (Playfair Display italic) rendered with the wrong typeface previously.
const FONTS: FontDef[] = [
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
  // Downloaded for serif_pop's hero word — the reference design is a bold
  // brush/cursive script, not a serif italic (Playfair Display's italic
  // reads as elegant-serif, not handwritten, so it didn't match).
  { family: "Kaushan Script", file: "fonts/KaushanScript-Regular.ttf", weight: "400" },
];

let loadPromise: Promise<void> | null = null;

/** Registers every local caption font with the page's FontFace set before
 * Remotion captures any frame. Must be called from the component body (not
 * an effect) so the delayRender() handle exists before the first paint. */
export const ensureFontsLoaded = (): void => {
  if (loadPromise || typeof document === "undefined") return;

  const handle = delayRender("Loading caption fonts");
  loadPromise = Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url(${staticFile(f.file)})`, {
        weight: f.weight ?? "normal",
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
