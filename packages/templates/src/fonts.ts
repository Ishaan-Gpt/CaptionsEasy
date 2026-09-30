import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

type GoogleFontModule = {
  loadFont: (style?: string, options?: { weights?: string[]; subsets?: string[]; ignoreTooManyRequestsWarning?: boolean }) => {
    fontFamily: string;
    waitUntilDone: () => Promise<void>;
  };
};

/**
 * Explicit lazy loaders (bundlers need static import paths). Keyed by the family name used in styles.
 * Add new families here; anything missing falls back to the system stack without failing the render.
 */
const LOADERS: Record<string, () => Promise<unknown>> = {
  Anton: () => import("@remotion/google-fonts/Anton"),
  "Archivo Black": () => import("@remotion/google-fonts/ArchivoBlack"),
  "Baloo 2": () => import("@remotion/google-fonts/Baloo2"),
  Bangers: () => import("@remotion/google-fonts/Bangers"),
  "Bebas Neue": () => import("@remotion/google-fonts/BebasNeue"),
  Caveat: () => import("@remotion/google-fonts/Caveat"),
  Cinzel: () => import("@remotion/google-fonts/Cinzel"),
  "Comic Neue": () => import("@remotion/google-fonts/ComicNeue"),
  "Cormorant Garamond": () => import("@remotion/google-fonts/CormorantGaramond"),
  "DM Sans": () => import("@remotion/google-fonts/DMSans"),
  Fredoka: () => import("@remotion/google-fonts/Fredoka"),
  Inter: () => import("@remotion/google-fonts/Inter"),
  "JetBrains Mono": () => import("@remotion/google-fonts/JetBrainsMono"),
  "Kaushan Script": () => import("@remotion/google-fonts/KaushanScript"),
  Lexend: () => import("@remotion/google-fonts/Lexend"),
  "Libre Baskerville": () => import("@remotion/google-fonts/LibreBaskerville"),
  "Lilita One": () => import("@remotion/google-fonts/LilitaOne"),
  "Luckiest Guy": () => import("@remotion/google-fonts/LuckiestGuy"),
  Manrope: () => import("@remotion/google-fonts/Manrope"),
  Montserrat: () => import("@remotion/google-fonts/Montserrat"),
  Mukta: () => import("@remotion/google-fonts/Mukta"),
  "Noto Color Emoji": () => import("@remotion/google-fonts/NotoColorEmoji"),
  Nunito: () => import("@remotion/google-fonts/Nunito"),
  Outfit: () => import("@remotion/google-fonts/Outfit"),
  "Permanent Marker": () => import("@remotion/google-fonts/PermanentMarker"),
  "Playfair Display": () => import("@remotion/google-fonts/PlayfairDisplay"),
  Poppins: () => import("@remotion/google-fonts/Poppins"),
  Righteous: () => import("@remotion/google-fonts/Righteous"),
  "Roboto Condensed": () => import("@remotion/google-fonts/RobotoCondensed"),
  "Rubik Mono One": () => import("@remotion/google-fonts/RubikMonoOne"),
  "Russo One": () => import("@remotion/google-fonts/RussoOne"),
  Sora: () => import("@remotion/google-fonts/Sora"),
  "Space Mono": () => import("@remotion/google-fonts/SpaceMono"),
  "Tilt Neon": () => import("@remotion/google-fonts/TiltNeon"),
  VT323: () => import("@remotion/google-fonts/VT323"),
};

export const KNOWN_FONTS = Object.keys(LOADERS).filter((f) => f !== "Noto Color Emoji");
export const EMOJI_FONT = "Noto Color Emoji";

const started = new Map<string, Promise<void>>();

export function loadFontFamily(family: string): Promise<void> {
  const existing = started.get(family);
  if (existing) return existing;
  const loader = LOADERS[family];
  const p = (async () => {
    if (!loader) return; // unknown / user font: assume already registered or fall back
    const mod = (await loader()) as GoogleFontModule;
    let loaded: ReturnType<GoogleFontModule["loadFont"]>;
    try {
      loaded = mod.loadFont("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"], ignoreTooManyRequestsWarning: true });
    } catch {
      // requested weights not offered by this family: load its defaults
      loaded = mod.loadFont(undefined, { subsets: ["latin"], ignoreTooManyRequestsWarning: true });
    }
    await loaded.waitUntilDone();
  })().catch(() => {
    started.delete(family); // allow a retry on the next mount
  });
  started.set(family, p);
  return p;
}

/**
 * Blocks rendering until every family is loaded. Call ONCE near the composition root so frames are
 * never captured with fallback glyphs, and measurement runs on real metrics.
 */
export function useFontsReady(families: string[]): boolean {
  const key = [...new Set(families.filter(Boolean))].sort().join("|");
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading caption fonts", { timeoutInMilliseconds: 60000 }));

  useEffect(() => {
    let alive = true;
    Promise.all(key.split("|").filter(Boolean).map(loadFontFamily))
      .then(() => {
        if (!alive) return;
        setReady(true);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
    return () => {
      alive = false;
    };
  }, [key, handle]);

  return ready;
}
