import React from "react";
import { AbsoluteFill, Composition, Sequence, type CalculateMetadataFunction } from "remotion";
import { CapClip, type CapClipProps } from "./CapClip";
import { clip } from "./footage";
import { useFontsReady } from "@capseasy/templates";
import { lookFonts, lookStyle } from "./components/LookCaptions";
import { CAP_LOOKS } from "./caplooks";
import { LOOK_SWITCHES } from "./timeline";
import { FPS, H, W } from "./theme";
import { SCENES, TOTAL } from "./timeline";
import { S01Feed } from "./scenes/S01Feed";
import { S02Mute } from "./scenes/S02Mute";
import { S03Grind } from "./scenes/S03Grind";
import { S04Reveal } from "./scenes/S04Reveal";
import { S05Drop } from "./scenes/S05Drop";
import { S06Words } from "./scenes/S06Words";
import { S07Looks } from "./scenes/S07Looks";
import { S08Edit } from "./scenes/S08Edit";
import { S09Export } from "./scenes/S09Export";
import { S10Callback } from "./scenes/S10Callback";
import { S11Values } from "./scenes/S11Values";
import { S12End } from "./scenes/S12End";

type SceneId = keyof typeof SCENES;
const PARTS: { id: SceneId; C: React.FC }[] = [
  { id: "feed", C: S01Feed },
  { id: "mute", C: S02Mute },
  { id: "grind", C: S03Grind },
  { id: "reveal", C: S04Reveal },
  { id: "drop", C: S05Drop },
  { id: "words", C: S06Words },
  { id: "looks", C: S07Looks },
  { id: "edit", C: S08Edit },
  { id: "export", C: S09Export },
  { id: "callback", C: S10Callback },
  { id: "values", C: S11Values },
  { id: "end", C: S12End },
];

// every look that appears anywhere in the film
const FILM_LOOKS = [...new Set([...LOOK_SWITCHES.map((s) => s.look), ...Object.values(CAP_LOOKS), "karaoke_fill", "hormozi_box", "beast_bounce", "comic_burst", "staggered_splash", "glow_stack_classic", "kinetic_mix", "neon_sign", "vintage_cinematic", "retro_3d", "highlighter_card", "gradient_pop"])];
const FILM_FONTS = [...new Set(FILM_LOOKS.flatMap((id) => lookFonts(lookStyle(id).style)))];

/** Loads every caption font once per render tab, so no scene ever waits on the network mid-render. */
const FontGate: React.FC = () => {
  useFontsReady(FILM_FONTS);
  return null;
};

/** The whole film: each scene in its slot (scenes handle their own in/out transitions). */
export const Launch: React.FC = () => (
  <AbsoluteFill style={{ background: "#0D0D0C" }}>
    <FontGate />
    {PARTS.map(({ id, C }) => (
      <Sequence key={id} from={SCENES[id].from} durationInFrames={SCENES[id].dur} name={id}>
        <C />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const capMeta: CalculateMetadataFunction<CapClipProps> = ({ props }) => ({ durationInFrames: Math.floor(clip(props.clipId).durationSec * 30) });

export const Root: React.FC = () => (
  <>
    <Composition id="CapClip" component={CapClip} durationInFrames={210} fps={30} width={540} height={960} defaultProps={{ clipId: "f_sam", look: "beast_bounce", sizeMul: 1.7 }} calculateMetadata={capMeta} />
    <Composition id="CapClipHero" component={CapClip} durationInFrames={210} fps={30} width={1080} height={1920} defaultProps={{ clipId: "musuweu_lang", look: "hormozi_box", sizeMul: 1.5 }} calculateMetadata={capMeta} />
    <Composition id="Launch" component={Launch} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    {PARTS.map(({ id, C }) => (
      <Composition key={id} id={`S-${id}`} component={C} durationInFrames={SCENES[id].dur} fps={FPS} width={W} height={H} />
    ))}
  </>
);
