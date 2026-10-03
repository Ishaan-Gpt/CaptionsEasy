import manifest from "./footage.json";
import type { FeedClip } from "./three/FeedField";
import type { TimedWord } from "./components/LookCaptions";

type Entry = { src: string; poster: string; voice?: string; durationSec: number; words: TimedWord[] };
export const FOOTAGE = manifest as unknown as Record<string, Entry>;

export const clip = (id: string): Entry => {
  const c = FOOTAGE[id];
  if (!c) throw new Error(`no footage ${id}`);
  return c;
};

/** The act-1 wall: everyone talking, nobody captioned. */
export const FEED_RAW: FeedClip[] = Object.entries(FOOTAGE)
  .filter(([id]) => id.startsWith("f_"))
  .map(([, c]) => ({ src: c.src, poster: c.poster, durationSec: c.durationSec }));
