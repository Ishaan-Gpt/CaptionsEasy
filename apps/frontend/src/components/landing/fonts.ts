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
  Lilita_One,
  Space_Mono,
  Montserrat,
} from "next/font/google";

export const anton = Anton({ weight: "400", subsets: ["latin"] });
export const outfit = Outfit({ weight: ["600", "700", "800"], subsets: ["latin"] });
export const playfair = Playfair_Display({
  weight: ["800"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});
export const baloo = Baloo_2({ weight: "800", subsets: ["latin"] });
export const kaushan = Kaushan_Script({ weight: "400", subsets: ["latin"] });
export const fredoka = Fredoka({ weight: ["600", "700"], subsets: ["latin"] });
export const caveat = Caveat({ weight: "700", subsets: ["latin"] });
export const cinzel = Cinzel({ weight: ["600", "800"], subsets: ["latin"] });
export const lilita = Lilita_One({ weight: "400", subsets: ["latin"] });
export const spaceMono = Space_Mono({ weight: "700", subsets: ["latin"] });
export const montserrat = Montserrat({ weight: ["800", "900"], subsets: ["latin"] });
