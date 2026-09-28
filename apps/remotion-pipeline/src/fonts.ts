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
//
// These are the fonts every STACK_SKINS template hardcodes regardless of the
// user's own font pick (CaptionEngine.tsx STACK_SKINS) — bundled locally so
// they always resolve even if the render machine has no outbound network at
// render time. Any *other* family the user picks (the 96-entry POPULAR_FONTS
// list in SidebarControlsSection.tsx) is fetched from Google Fonts at render
// time instead — see fetchGoogleFontFaces below — the same CDN convention
// the browser preview already uses (page.tsx's ensureFontLoaded), so export
// isn't limited to a small hardcoded allowlist the frontend has to stay in
// sync with by hand.
const BUNDLED_FONTS: FontDef[] = [
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

const BUNDLED_FAMILIES = new Set(BUNDLED_FONTS.map((f) => f.family));

// Same weight set page.tsx's ensureFontLoaded requests for the browser
// preview — matching it means a family either renders identically in both
// places or fails identically in both (network-dependent), never one
// looking right and the other silently substituting a system font.
const GOOGLE_FONT_WEIGHTS = "400;700;800;900";

/** Parses a Google Fonts css2 stylesheet response into FontDefs. Tolerant
 * of the exact @font-face formatting Google serves (one block per
 * weight/style combination actually available for that family). */
function parseGoogleFontCss(family: string, css: string): FontDef[] {
  const defs: FontDef[] = [];
  const blockRe = /@font-face\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css))) {
    const block = match[1];
    const urlMatch = /url\(([^)]+)\)\s*format\(['"]truetype['"]\)/.exec(block);
    if (!urlMatch) continue;
    const weightMatch = /font-weight:\s*(\d+)/.exec(block);
    const styleMatch = /font-style:\s*(\w+)/.exec(block);
    defs.push({
      family,
      file: urlMatch[1].trim(),
      weight: weightMatch?.[1] ?? "400",
      style: styleMatch?.[1] ?? "normal",
    });
  }
  return defs;
}

/** Fetches a family's actual .ttf face URLs from Google Fonts — mirrors
 * page.tsx's ensureFontLoaded query, just resolved to raw font files
 * instead of a <link> tag since there's no document.head consumer here. */
async function fetchGoogleFontFaces(family: string): Promise<FontDef[]> {
  const familyParam = family.trim().replace(/\s+/g, "+");
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${GOOGLE_FONT_WEIGHTS}&display=swap`;
  try {
    // Google serves woff2 to browser-like UAs and ttf to older/plain ones;
    // Chromium's own UA would get woff2, which loads identically via
    // FontFace — an explicit UA isn't needed here, just a real fetch.
    const res = await fetch(cssUrl);
    if (!res.ok) return [];
    const css = await res.text();
    return parseGoogleFontCss(family, css);
  } catch (err) {
    console.error(`Failed to fetch Google Fonts CSS for "${family}"`, err);
    return [];
  }
}

const resolveFontSrc = (file: string): string => (/^https?:\/\//.test(file) ? file : staticFile(file));

let loadPromise: Promise<void> | null = null;
let loadedFamiliesKey = "";

/** Registers every caption font with the page's FontFace set before Remotion
 * captures any frame — the bundled local set unconditionally, plus a
 * best-effort Google Fonts fetch for any additional family actually used by
 * this render's style (extraFamilies: [style.font, style.heroFont, ...]).
 * Must be called from the component body (not an effect) so the
 * delayRender() handle exists before the first paint. Re-entrant per unique
 * family set so re-renders (Remotion re-mounts the composition per frame
 * batch) don't refetch on every call. */
export const ensureFontsLoaded = (extraFamilies: (string | null | undefined)[] = []): void => {
  if (typeof document === "undefined") return;

  const wanted = Array.from(
    new Set(
      extraFamilies
        .map((f) => (f || "").trim())
        .filter((f) => f.length > 0 && !BUNDLED_FAMILIES.has(f))
    )
  ).sort();
  const key = wanted.join("|");
  if (loadPromise && loadedFamiliesKey === key) return;
  loadedFamiliesKey = key;

  const handle = delayRender("Loading caption fonts");

  const loadLocal = BUNDLED_FONTS.map((f) =>
    new FontFace(f.family, `url(${resolveFontSrc(f.file)})`, {
      weight: f.weight ?? "normal",
      style: f.style ?? "normal",
    })
      .load()
      .then((face) => {
        (document.fonts as FontFaceSet).add(face);
      })
      .catch((err) => {
        console.error(`Failed to load bundled font ${f.family} (${f.file})`, err);
      })
  );

  const loadDynamic = wanted.map(async (family) => {
    const defs = await fetchGoogleFontFaces(family);
    await Promise.all(
      defs.map((f) =>
        new FontFace(f.family, `url(${resolveFontSrc(f.file)})`, {
          weight: f.weight ?? "normal",
          style: f.style ?? "normal",
        })
          .load()
          .then((face) => {
            (document.fonts as FontFaceSet).add(face);
          })
          .catch((err) => {
            console.error(`Failed to load Google font ${family} (${f.file})`, err);
          })
      )
    );
  });

  loadPromise = Promise.all([...loadLocal, ...loadDynamic]).then(() => undefined);
  loadPromise.finally(() => continueRender(handle));
};
