import { Easing, interpolate, spring } from "remotion";

/** The landing page's entrance curve: cubic-bezier(0.16, 1, 0.3, 1). */
export const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EXPO_IN = Easing.bezier(0.7, 0, 0.84, 0);
export const EXPO_IN_OUT = Easing.bezier(0.87, 0, 0.13, 1);
export const SMOOTH = Easing.bezier(0.45, 0, 0.2, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 between two frames with an easing. */
export const ramp = (frame: number, from: number, to: number, ease: (t: number) => number = EXPO_OUT) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Map with clamping. */
export const map = (v: number, input: number[], output: number[], ease?: (t: number) => number) =>
  interpolate(v, input, output, { ...clamp, ...(ease ? { easing: ease } : {}) });

export const springIn = (frame: number, fps: number, at: number, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 180, mass: 1, ...cfg } });

/**
 * Speed ramp: integrates a speed curve so a value travels fast-slow-fast (or any shape) and still lands exactly.
 * `keys` are [frame, speed] pairs (speed is relative); returns progress 0→1 across [keys[0].frame, last.frame].
 */
export function speedRamp(frame: number, keys: [number, number][]): number {
  const total = integrate(keys, keys[keys.length - 1]![0]);
  return Math.max(0, Math.min(1, integrate(keys, frame) / total));
}
function integrate(keys: [number, number][], upTo: number): number {
  let area = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, s0] = keys[i]!;
    const [f1, s1] = keys[i + 1]!;
    if (upTo <= f0) break;
    const end = Math.min(upTo, f1);
    // smoothstep between speeds so the ramp has no corners
    const steps = Math.max(1, Math.ceil(end - f0));
    for (let k = 0; k < steps; k++) {
      const a = f0 + ((end - f0) * k) / steps;
      const b = f0 + ((end - f0) * (k + 1)) / steps;
      const mid = (a + b) / 2;
      const t = (mid - f0) / (f1 - f0);
      const st = t * t * (3 - 2 * t);
      area += (s0 + (s1 - s0) * st) * (b - a);
    }
  }
  return area;
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Camera-style keyframes: holds between keys, eases (expo in-out) across each move. */
export function keys(frame: number, ks: { at: number; v: number[]; dur?: number }[]): number[] {
  let cur = ks[0]!.v;
  for (let i = 1; i < ks.length; i++) {
    const k = ks[i]!;
    const dur = k.dur ?? 26;
    if (frame <= k.at - dur) break;
    const t = interpolate(frame, [k.at - dur, k.at], [0, 1], { ...clamp, easing: EXPO_IN_OUT });
    cur = cur.map((a, j) => a + (k.v[j]! - a) * t);
  }
  return cur;
}
