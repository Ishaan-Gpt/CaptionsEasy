/**
 * One source of truth for picture AND sound: scene boundaries and every audio cue, in frames at 60 fps
 * (120 BPM, so a beat is 30 frames and a bar is 120). scripts/soundtrack.ts builds the score from this file.
 */
export const SCENES = {
  feed: { from: 0, dur: 240 },
  mute: { from: 240, dur: 240 },
  grind: { from: 480, dur: 240 },
  reveal: { from: 720, dur: 360 },
  drop: { from: 1080, dur: 180 },
  words: { from: 1260, dur: 300 },
  looks: { from: 1560, dur: 420 },
  edit: { from: 1980, dur: 240 },
  export: { from: 2220, dur: 180 },
  callback: { from: 2400, dur: 360 },
  values: { from: 2760, dur: 240 },
  end: { from: 3000, dur: 300 },
} as const;

export const TOTAL = 3300;

/** Omar's line plays from here (S6 into S7). */
export const VOICE_AT = SCENES.words.from;

/** S7: when each look takes over (absolute frames), accelerating like a speed ramp. */
export const LOOK_SWITCHES: { at: number; look: string }[] = (() => {
  const order = [
    "hormozi_box", "beast_bounce", "staggered_splash", "comic_burst", "glow_stack_classic", "kinetic_mix", "karaoke_fill",
    "vintage_cinematic", "neon_sign", "serif_pop_classic", "retro_3d", "highlighter_card", "gradient_pop", "chat_bubble", "outline_fill", "hormozi_box",
  ];
  const gaps = [36, 30, 30, 24, 24, 20, 18, 16, 14, 12, 12, 10, 10, 12, 16];
  let at = SCENES.looks.from + 36;
  const out: { at: number; look: string }[] = [{ at: SCENES.looks.from, look: order[0]! }];
  for (let i = 1; i < order.length; i++) {
    out.push({ at, look: order[i]! });
    at += gaps[i - 1] ?? 12;
  }
  return out;
})();

/** Where the ring reveal of S7 starts (after the last switch settles). */
export const RING_AT = SCENES.looks.from + 300;

/** Sound cues (absolute frames). */
export const CUES = {
  swipes: [30, 60, 90, 112, 128, 141, 152, 161, 168],
  tick: [] as number[],
  muteIn: 300,
  scrollAway: 420,
  scratch: 430,
  typing: { from: 480, to: 690 },
  grindHits: [600, 630, 660],
  drop: 720,
  logoRise: 770,
  wordmark: 860,
  tagline: 930,
  fileDrop: 1112,
  uploadDone: 1222,
  wordPops: [] as number[],
  ring: RING_AT,
  editClick: [2010, 2075, 2140],
  exportClick: 2252,
  exportDone: 2338,
  feedStop: 2540,
  hearts: [2560, 2620, 2680],
  valueHits: [2760, 2820, 2880, 2940],
  endHit: 3000,
};
