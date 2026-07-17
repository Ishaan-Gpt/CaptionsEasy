/**
 * Display fonts used ONLY to render authentic caption-template specimens
 * on the landing page. These mirror the fonts the render pipeline actually
 * burns into exports (see src/config/captionTemplates.ts), so what the
 * visitor sees is what the product ships.
 */
import {
  Anton,
  Outfit,
  Playfair_Display,
  Baloo_2,
  Kaushan_Script,
  Fredoka,
  Caveat,
  Cinzel,
} from "next/font/google";

export const anton = Anton({ weight: "400", subsets: ["latin"] });
export const outfit = Outfit({ weight: ["600", "700"], subsets: ["latin"] });
export const playfair = Playfair_Display({
  weight: ["800"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});
export const baloo = Baloo_2({ weight: "800", subsets: ["latin"] });
export const kaushan = Kaushan_Script({ weight: "400", subsets: ["latin"] });
export const fredoka = Fredoka({ weight: "600", subsets: ["latin"] });
export const caveat = Caveat({ weight: "700", subsets: ["latin"] });
export const cinzel = Cinzel({ weight: "800", subsets: ["latin"] });
