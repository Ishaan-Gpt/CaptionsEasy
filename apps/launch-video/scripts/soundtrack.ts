/**
 * The score, synthesised from the same timeline as the picture (src/timeline.ts), so every hit lands on its cut.
 * 120 BPM, A minor / C major. Drums, bass, pads and plucks are generated here; a few recorded effects (whoosh,
 * click, ding, scratch) come from public/audio; the two voices are the speakers' real audio.
 *   pnpm exec tsx scripts/soundtrack.ts   ->  out/score.wav (48 kHz, 16-bit stereo)
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CUES, LOOK_SWITCHES, SCENES, TOTAL } from "../src/timeline";

const SR = 48000;
const LEN = Math.ceil((TOTAL / 60 + 1.5) * SR);
const BEAT = 0.5;
const sec = (frame: number) => frame / 60;
const S = (t: number) => Math.round(t * SR);

// ---------- buses ----------
type Bus = { L: Float32Array; R: Float32Array };
const bus = (): Bus => ({ L: new Float32Array(LEN), R: new Float32Array(LEN) });
const drums = bus(), bass = bus(), pad = bus(), pluck = bus(), fx = bus(), voice = bus(), verbSend = bus();

let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const noise = () => rnd() * 2 - 1;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function add(b: Bus, i: number, l: number, r = l) {
  if (i < 0 || i >= LEN) return;
  b.L[i]! += l;
  b.R[i]! += r;
}

// ---------- filters ----------
class Biquad {
  a1 = 0; a2 = 0; b0 = 1; b1 = 0; b2 = 0; x1 = 0; x2 = 0; y1 = 0; y2 = 0;
  set(type: "lp" | "hp" | "bp", f: number, q = 0.707) {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0: number, b1: number, b2: number;
    if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
    else if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cs) / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

// band-limited saw (polyBLEP)
const blep = (t: number, dt: number) => (t < dt ? ((t /= dt), t + t - t * t - 1) : t > 1 - dt ? ((t = (t - 1) / dt), t * t + t + t + 1) : 0);
function sawVoice(freq: number, n: number, phase0 = 0) {
  const out = new Float32Array(n);
  let ph = phase0;
  const dt = freq / SR;
  for (let i = 0; i < n; i++) {
    out[i] = 2 * ph - 1 - blep(ph, dt);
    ph += dt;
    if (ph >= 1) ph -= 1;
  }
  return out;
}

// ---------- instruments ----------
function kick(t: number, gain = 1, b: Bus = drums) {
  const n = S(0.42);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    const f = 46 + 110 * Math.exp(-s * 32);
    ph += f / SR;
    const env = Math.exp(-s * 7.5);
    const click = i < 90 ? noise() * (1 - i / 90) * 0.35 : 0;
    const v = (Math.sin(2 * Math.PI * ph) * env + click) * gain;
    add(b, S(t) + i, v, v);
  }
  duck.push(t);
}
function clap(t: number, gain = 0.5) {
  const f = new Biquad().set("bp", 1450, 0.9);
  const n = S(0.32);
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    const bursts = (s < 0.01 ? 1 : 0) + (s > 0.011 && s < 0.02 ? 0.8 : 0) + (s > 0.021 ? Math.exp(-(s - 0.021) * 18) : 0);
    const v = f.run(noise()) * bursts * gain * 2.2;
    add(drums, S(t) + i, v * 0.9, v);
    add(verbSend, S(t) + i, v * 0.35, v * 0.35);
  }
}
function hat(t: number, gain = 0.12, open = false) {
  const f = new Biquad().set("hp", 7800, 0.7);
  const n = S(open ? 0.28 : 0.05);
  const pan = 0.25 + rnd() * 0.15;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    const v = f.run(noise()) * Math.exp(-s * (open ? 12 : 70)) * gain;
    add(drums, S(t) + i, v * (1 - pan), v * (1 + pan));
  }
}
function bassNote(t: number, midi: number, dur: number, gain = 0.35, cutoff = 700) {
  const n = S(dur + 0.05);
  const saw = sawVoice(mtof(midi), n);
  const lp = new Biquad();
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    if (i % 64 === 0) lp.set("lp", cutoff * (0.6 + 1.2 * Math.exp(-s * 9)), 0.9);
    ph += mtof(midi - 12) / SR;
    const env = Math.min(1, s / 0.005) * (s < dur ? 1 : Math.max(0, 1 - (s - dur) / 0.05));
    const v = (lp.run(saw[i]!) * 0.7 + Math.sin(2 * Math.PI * ph) * 0.8) * env * gain;
    add(bass, S(t) + i, v, v);
  }
}
function padChord(t: number, notes: number[], dur: number, gain = 0.07, cutoff = 1700) {
  const n = S(dur + 1.2);
  notes.forEach((m, k) => {
    for (const [det, side] of [[-0.11, -1], [0.0, 0], [0.12, 1]] as const) {
      const saw = sawVoice(mtof(m + det), n, rnd());
      const lp = new Biquad().set("lp", cutoff, 0.6);
      for (let i = 0; i < n; i++) {
        const s = i / SR;
        const env = Math.min(1, s / 0.45) * (s < dur ? 1 : Math.max(0, 1 - (s - dur) / 1.2));
        const v = lp.run(saw[i]!) * env * gain;
        const pan = side * 0.6 + (k - 1) * 0.15;
        add(pad, S(t) + i, v * (1 - pan * 0.5), v * (1 + pan * 0.5));
      }
    }
  });
}
function pluckNote(t: number, midi: number, gain = 0.12, pan = 0, decay = 7) {
  const n = S(0.6);
  const saw = sawVoice(mtof(midi), n);
  const saw2 = sawVoice(mtof(midi + 12.04), n);
  const lp = new Biquad();
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    if (i % 32 === 0) lp.set("lp", 600 + 5200 * Math.exp(-s * 16), 1.1);
    const v = lp.run(saw[i]! * 0.7 + saw2[i]! * 0.3) * Math.exp(-s * decay) * Math.min(1, s / 0.002) * gain;
    add(pluck, S(t) + i, v * (1 - pan), v * (1 + pan));
  }
}
function riser(t0: number, t1: number, gain = 0.25) {
  const n = S(t1 - t0);
  const bp = new Biquad();
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    if (i % 64 === 0) bp.set("bp", 300 * Math.pow(30, p), 1.4);
    ph += (180 * Math.pow(9, p)) / SR;
    const tone = (2 * (ph % 1) - 1) * 0.12;
    const v = (bp.run(noise()) * 1.4 + tone) * Math.pow(p, 2.2) * gain;
    const w = Math.sin(p * Math.PI * 6) * 0.3 * p;
    add(fx, S(t0) + i, v * (1 - w), v * (1 + w));
    add(verbSend, S(t0) + i, v * 0.3, v * 0.3);
  }
}
function impact(t: number, gain = 0.9, size = 1) {
  const n = S(2.4 * size);
  let ph = 0;
  const lp = new Biquad().set("lp", 900, 0.7);
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    ph += (34 + 70 * Math.exp(-s * 6)) / SR;
    const boom = Math.sin(2 * Math.PI * ph) * Math.exp(-s * (2.2 / size));
    const crack = lp.run(noise()) * Math.exp(-s * 9);
    const v = (boom * 1.1 + crack * 0.8) * gain;
    add(fx, S(t) + i, v, v);
    if (s < 0.4) add(verbSend, S(t) + i, crack * gain * 0.8, crack * gain * 0.8);
  }
  duck.push(t);
}
function whooshSynth(t: number, dur = 0.5, gain = 0.3, dir = 1) {
  const n = S(dur);
  const bp = new Biquad();
  for (let i = 0; i < n; i++) {
    const p = i / n;
    if (i % 64 === 0) bp.set("bp", dir > 0 ? 400 + 5000 * p : 5400 - 5000 * p, 1.2);
    const env = Math.sin(Math.PI * p) ** 2;
    const pan = (p - 0.5) * 1.4 * dir;
    const v = bp.run(noise()) * env * gain * 2;
    add(fx, S(t) + i, v * (1 - pan), v * (1 + pan));
  }
}
function tick(t: number, gain = 0.25, f = 2600) {
  const n = S(0.03);
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    const v = (Math.sin(2 * Math.PI * f * s) * 0.6 + noise() * 0.3) * Math.exp(-s * 160) * gain;
    add(fx, S(t) + i, v, v);
  }
}
function keyClick(t: number, gain = 0.18) {
  const f = new Biquad().set("bp", 2400 + rnd() * 1800, 1.6);
  const n = S(0.025);
  const pan = rnd() * 0.6 - 0.3;
  for (let i = 0; i < n; i++) {
    const v = f.run(noise()) * Math.exp(-(i / SR) * 260) * gain * 2.5;
    add(fx, S(t) + i, v * (1 - pan), v * (1 + pan));
  }
}
function pop(t: number, gain = 0.2) {
  const n = S(0.09);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    ph += (520 + 900 * (s / 0.09)) / SR;
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-s * 40) * gain;
    add(fx, S(t) + i, v, v);
  }
}

// ---------- recorded effects & voices ----------
function load(file: string, from = 0, dur?: number): Bus {
  const args = ["-v", "error", "-ss", String(from), ...(dur ? ["-t", String(dur)] : []), "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"];
  const r = spawnSync("ffmpeg", args, { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`cannot read ${file}`);
  const buf = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
  const n = buf.length / 2;
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  for (let i = 0; i < n; i++) { out.L[i] = buf[2 * i]!; out.R[i] = buf[2 * i + 1]!; }
  return out;
}
function place(b: Bus, src: Bus, t: number, gain = 1, fadeIn = 0.01, fadeOut = 0.05) {
  const n = src.L.length;
  const fi = S(fadeIn), fo = S(fadeOut);
  for (let i = 0; i < n; i++) {
    const g = gain * Math.min(1, fi ? i / fi : 1) * Math.min(1, fo ? (n - i) / fo : 1);
    add(b, S(t) + i, src.L[i]! * g, src.R[i]! * g);
  }
}
const sfx = (name: string) => load(resolve(`public/audio/${name}.wav`));
const WHOOSH = sfx("whoosh"), WHIP = sfx("whip"), CLICK = sfx("mouse-click"), DING = sfx("ding"), SCRATCH = sfx("record-scratch"), SWITCH = sfx("switch"), SHUTTER = sfx("shutter-modern");

const duck: number[] = [];

// ---------- harmony ----------
const A2 = 45, F2 = 41, C3 = 48, G2 = 43, E2 = 40;
const CHORDS: Record<string, { root: number; notes: number[]; arp: number[] }> = {
  Am: { root: A2, notes: [57, 60, 64, 67], arp: [69, 72, 76, 79, 81, 79, 76, 72] },
  F: { root: F2, notes: [53, 57, 60, 64], arp: [65, 69, 72, 76, 77, 76, 72, 69] },
  C: { root: C3 - 12, notes: [55, 60, 64, 67], arp: [67, 72, 76, 79, 84, 79, 76, 72] },
  G: { root: G2, notes: [55, 59, 62, 67], arp: [67, 71, 74, 79, 83, 79, 74, 71] },
  Em: { root: E2, notes: [55, 59, 64, 67], arp: [64, 67, 71, 76, 79, 76, 71, 67] },
};
const PROG = ["F", "G", "Am", "C"];

// ---------- the arrangement ----------
const t = (frame: number) => sec(frame);
const sc = (id: keyof typeof SCENES) => ({ from: sec(SCENES[id].from), to: sec(SCENES[id].from + SCENES[id].dur) });

// ACT 1 — feed (0–4 s): pulse, hats, a swipe on every flick, riser into the mute
{
  const { to } = sc("feed");
  for (let b = 0; b < to / BEAT; b++) {
    kick(b * BEAT, 0.75);
    for (let k = 0; k < 2; k++) bassNote(b * BEAT + k * 0.25, A2, 0.2, 0.28, 520);
    for (let k = 0; k < 4; k++) hat(b * BEAT + k * 0.125, k % 2 ? 0.05 : 0.09);
  }
  padChord(0, CHORDS.Am!.notes, 4, 0.04, 900);
  CUES.swipes.forEach((f, i) => place(fx, WHOOSH, t(f) - 0.05, i < 3 ? 0.9 : 0.45));
  riser(2.2, 4.0, 0.16);
}
// mute (4–8 s): the same groove, heard through a wall (filtered below), the flick, the scratch, silence, "Scrolled."
{
  const { from } = sc("mute");
  for (let b = 0; b < 6.4 / BEAT; b++) {
    const at = from + b * BEAT;
    kick(at, 0.75);
    for (let k = 0; k < 2; k++) bassNote(at + k * 0.25, b % 8 < 4 ? A2 : F2, 0.2, 0.28, 520);
    hat(at + 0.25, 0.06);
  }
  padChord(from, CHORDS.Am!.notes, 2, 0.05, 900);
  padChord(from + 2, CHORDS.F!.notes, 1.2, 0.05, 900);
  tick(t(CUES.muteIn), 0.35, 900);
  place(fx, WHIP, t(CUES.scrollAway) - 0.02, 1.1);
  whooshSynth(t(CUES.scrollAway) - 0.1, 0.45, 0.35, -1);
  place(fx, SCRATCH, t(CUES.scratch) - 0.03, 0.55, 0.005, 0.3);
  impact(t(CUES.scratch) + 0.05, 0.55, 0.8);
}
// grind (8–12 s): a clock, typing, the pulse doubling, three hits, a riser and a snare roll into the drop
{
  const { from, to } = sc("grind");
  for (let x = from, k = 0; x < to - 0.5; k++) {
    tick(x, 0.22, k % 4 === 0 ? 2200 : 3100);
    x += Math.max(0.0625, 0.5 * Math.pow(0.86, k));
  }
  for (let x = from + 0.1; x < to - 0.6; ) {
    keyClick(x, 0.16);
    x += 0.05 + rnd() * Math.max(0.03, 0.16 - (x - from) * 0.03);
  }
  for (let b = 0; b < (to - from - 0.5) / BEAT; b++) {
    const at = from + b * BEAT;
    kick(at, 0.85);
    for (let k = 0; k < 4; k++) bassNote(at + k * 0.125, A2 + (b >= 4 ? 1 : 0), 0.1, 0.24, 600 + b * 60);
    hat(at + 0.25, 0.08);
  }
  CUES.grindHits.forEach((f) => { impact(t(f), 0.6, 0.6); clap(t(f), 0.6); });
  riser(9.3, 12.0, 0.32);
  for (let x = 11.0, k = 0; x < 11.95; k++) {
    clap(x, 0.14 + (x - 11) * 0.35);
    x += x < 11.5 ? 0.125 : 0.0625;
  }
}

// ACT 2 — the drop (12 s): impact, the progression starts, bars rise as plucks
const DROP = t(CUES.drop);
impact(DROP, 1.0, 1.6);
place(fx, SHUTTER, DROP, 0.25);
for (let bar = 0; bar < 3; bar++) padChord(DROP + bar * 2, CHORDS[PROG[bar % 4]!]!.notes, 2, 0.075, 2200);
// half-time groove under the reveal
for (let b = 2; b < 12; b++) {
  const at = DROP + b * BEAT;
  if (b % 2 === 0) kick(at, 0.7);
  if (b % 4 === 2) clap(at, 0.35);
  hat(at + 0.25, 0.06);
  bassNote(at, CHORDS[PROG[Math.floor(b / 4) % 4]!]!.root, 0.45, 0.3, 500);
}
[0, 9, 18].forEach((d, i) => pluckNote(t(CUES.logoRise) + d / 60, [72, 79, 76][i]!, 0.16, [-0.4, 0, 0.4][i]!, 5));
whooshSynth(t(CUES.wordmark) - 0.25, 0.6, 0.25);
pluckNote(t(CUES.tagline), 84, 0.1, 0.2, 4);
pluckNote(t(CUES.tagline) + 0.12, 88, 0.08, -0.2, 4);

// ACT 3 — the product (18–40 s): full groove
const GROOVE_FROM = 18;
const GROOVE_TO = sc("callback").from;
for (let x = GROOVE_FROM; x < GROOVE_TO - 0.01; x += 2) {
  const bar = Math.round((x - DROP) / 2);
  const ch = CHORDS[PROG[bar % 4]!]!;
  padChord(x, ch.notes, 2, 0.06, 1900);
  for (let b = 0; b < 4; b++) {
    const at = x + b * BEAT;
    kick(at, 0.8);
    if (b % 2 === 1) clap(at, 0.38);
    for (let k = 0; k < 4; k++) hat(at + k * 0.125, k === 2 ? 0.09 : 0.045, k === 2 && b === 3);
    bassNote(at, ch.root, 0.22, 0.3, 650);
    bassNote(at + 0.25, ch.root + (b === 3 ? 7 : 0), 0.18, 0.24, 650);
    // plucked arpeggio, eighth notes, alternating sides
    for (let k = 0; k < 2; k++) pluckNote(at + k * 0.25, ch.arp[(b * 2 + k) % 8]!, 0.07, k ? 0.35 : -0.35, 9);
  }
}
place(fx, WHIP, sc("drop").from - 0.05, 0.6);
place(fx, SHUTTER, t(CUES.fileDrop), 0.3);
pop(t(CUES.fileDrop), 0.25);
tick(t(CUES.uploadDone), 0.3, 1800);
place(fx, DING, t(CUES.uploadDone), 0.25);
whooshSynth(sc("words").from - 0.15, 0.4, 0.3, -1);
// S7: a soft switch on every new look; the ring arrives on a swell
LOOK_SWITCHES.slice(1).forEach((s, i) => { place(fx, SWITCH, t(s.at), 0.22 + i * 0.01); tick(t(s.at), 0.08, 3800); });
riser(t(CUES.ring) - 1.2, t(CUES.ring), 0.14);
impact(t(CUES.ring), 0.4, 0.8);
whooshSynth(t(CUES.ring), 0.9, 0.25);
// S8: clicks and typing
CUES.editClick.forEach((f) => place(fx, CLICK, t(f), 0.7));
for (let x = t(SCENES.edit.from + 36); x < t(SCENES.edit.from + 72); x += 0.07 + rnd() * 0.05) keyClick(x, 0.2);
// S9: export
place(fx, CLICK, t(CUES.exportClick), 0.8);
riser(t(CUES.exportClick) + 0.1, t(CUES.exportDone), 0.12);
place(fx, DING, t(CUES.exportDone), 0.55);
pop(t(CUES.exportDone), 0.2);
whooshSynth(sc("callback").from - 0.35, 0.5, 0.35);

// ACT 4 — the callback (40–46 s): brighter, faster; the scroll brakes; hearts
{
  const { from, to } = sc("callback");
  for (let x = from; x < to - 0.01; x += 2) {
    const bar = Math.round((x - DROP) / 2);
    const ch = CHORDS[PROG[bar % 4]!]!;
    padChord(x, ch.notes.map((n) => n + 12), 2, 0.045, 2600);
    padChord(x, ch.notes, 2, 0.05, 2000);
    for (let b = 0; b < 4; b++) {
      const at = x + b * BEAT;
      kick(at, 0.85);
      if (b % 2 === 1) clap(at, 0.42);
      for (let k = 0; k < 4; k++) hat(at + k * 0.125, k % 2 ? 0.05 : 0.09);
      for (let k = 0; k < 2; k++) bassNote(at + k * 0.25, ch.root, 0.2, 0.3, 720);
      for (let k = 0; k < 4; k++) pluckNote(at + k * 0.125, ch.arp[(b * 4 + k) % 8]! + 12, 0.045, k % 2 ? 0.45 : -0.45, 11);
    }
  }
  for (let k = 0; k < 6; k++) whooshSynth(from + 0.1 + k * 0.32, 0.3, 0.16, k % 2 ? 1 : -1);
  impact(t(CUES.feedStop), 0.5, 0.7);
  for (let i = 0; i < 14; i++) pop(t(SCENES.callback.from + 140 + 14 + i * 11), 0.12);
}
// values (46–50 s): one slam per promise
{
  const { from } = sc("values");
  CUES.valueHits.forEach((f, i) => {
    impact(t(f), 0.75, 0.7);
    clap(t(f), 0.5);
    place(fx, WHOOSH, t(f) - 0.08, 0.6);
    bassNote(t(f), [F2, G2, A2, C3 - 12][i]!, 0.9, 0.38, 800);
    padChord(t(f), CHORDS[PROG[i]!]!.notes, 1, 0.06, 2400);
  });
  for (let b = 0; b < 8; b++) {
    const at = from + b * BEAT;
    kick(at, 0.8);
    for (let k = 0; k < 4; k++) hat(at + k * 0.125, 0.07);
    if (b % 2 === 1) clap(at, 0.3);
  }
  riser(from + 3, from + 4, 0.2);
}
// end (50–55 s): the resolve, the bars as plucks, a long tail
{
  const at = t(CUES.endHit);
  impact(at, 0.9, 1.8);
  padChord(at, [53, 57, 60, 64, 67], 2.4, 0.07, 2400);
  padChord(at + 2.4, [48, 55, 60, 64, 67, 72], 2.8, 0.07, 2200);
  bassNote(at, F2, 2.3, 0.3, 500);
  bassNote(at + 2.4, C3 - 12, 2.6, 0.3, 450);
  [0, 9, 18].forEach((d, i) => pluckNote(at + 0.1 + d / 60, [72, 79, 76][i]!, 0.15, [-0.4, 0, 0.4][i]!, 4));
  pluckNote(at + 2.4, 84, 0.1, 0, 3);
  pluckNote(at + 2.55, 79, 0.08, 0.3, 3);
  pluckNote(at + 2.7, 76, 0.07, -0.3, 3);
}

// voices: Omar (S6–S7), Musuweu as the feed stops (S10)
const OMAR_AT = sec(SCENES.words.from);
place(voice, load(resolve("public/footage/omar_line.wav"), 0, 10.4), OMAR_AT, 1, 0.02, 0.35);
const MUS_SRC_FROM = 3.62;
const MUS_AT = sec(SCENES.callback.from) + (MUS_SRC_FROM - (Math.round(3.7 * 60) - 140) / 60);
place(voice, load(resolve("public/footage/musuweu_lang.wav"), MUS_SRC_FROM, 3.45), MUS_AT, 1, 0.03, 0.25);

// ---------- processing ----------
function normalizeBus(b: Bus, peak: number) {
  let m = 0;
  for (let i = 0; i < LEN; i++) m = Math.max(m, Math.abs(b.L[i]!), Math.abs(b.R[i]!));
  if (m > 0) for (let i = 0; i < LEN; i++) { b.L[i]! *= peak / m; b.R[i]! *= peak / m; }
}
// voice: gentle high-pass + compression, then level
{
  const hl = new Biquad().set("hp", 90), hr = new Biquad().set("hp", 90);
  let env = 0;
  for (let i = 0; i < LEN; i++) {
    let l = hl.run(voice.L[i]!), r = hr.run(voice.R[i]!);
    const a = Math.max(Math.abs(l), Math.abs(r));
    env = a > env ? env + (a - env) * 0.01 : env + (a - env) * 0.0005;
    const g = env > 0.25 ? 0.25 / env + (1 - 0.25 / env) * 0.35 : 1;
    voice.L[i] = l * g; voice.R[i] = r * g;
  }
  normalizeBus(voice, 0.62);
}
// sidechain: bass and pads breathe with the kick
const sc_ = new Float32Array(LEN).fill(1);
for (const k of duck) for (let i = 0; i < S(0.22); i++) { const j = S(k) + i; if (j < LEN) sc_[j] = Math.min(sc_[j]!, 0.35 + 0.65 * Math.pow(i / S(0.22), 0.8)); }
for (let i = 0; i < LEN; i++) { bass.L[i]! *= sc_[i]!; bass.R[i]! *= sc_[i]!; pad.L[i]! *= 0.5 + 0.5 * sc_[i]!; pad.R[i]! *= 0.5 + 0.5 * sc_[i]!; }
// ping-pong delay on the plucks (dotted eighth)
{
  const d = S(0.375);
  for (let i = d; i < LEN; i++) { pluck.L[i]! += pluck.R[i - d]! * 0.32; pluck.R[i]! += pluck.L[i - d]! * 0.32; }
  for (let i = 0; i < LEN; i++) { verbSend.L[i]! += pluck.L[i]! * 0.3 + pad.L[i]! * 0.25; verbSend.R[i]! += pluck.R[i]! * 0.3 + pad.R[i]! * 0.25; }
}
// reverb (Freeverb)
const reverb = (() => {
  const k = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * k));
  const apT = [556, 441, 341, 225].map((x) => Math.round(x * k));
  const out = bus();
  for (const [ch, spread] of [["L", 0], ["R", 23]] as const) {
    const src = verbSend[ch];
    const combs = combT.map((n) => ({ buf: new Float32Array(n + spread), i: 0, store: 0 }));
    const aps = apT.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
    const dst = out[ch];
    for (let i = 0; i < LEN; i++) {
      const x = src[i]! * 0.015;
      let y = 0;
      for (const c of combs) {
        const o = c.buf[c.i]!;
        c.store = o * 0.8 + c.store * 0.2;
        c.buf[c.i] = x + c.store * 0.86;
        c.i = (c.i + 1) % c.buf.length;
        y += o;
      }
      for (const a of aps) {
        const o = a.buf[a.i]!;
        a.buf[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        y = o - y;
      }
      dst[i] = y;
    }
  }
  return out;
})();

// music bus = drums + bass + pad + pluck + reverb; muffled while the phone is "on mute"; ducked under voices
const music = bus();
{
  const lpL = new Biquad(), lpR = new Biquad();
  const muteFrom = sec(SCENES.mute.from) + 0.25, muteTo = sec(CUES.scratch);
  let duckEnv = 1;
  for (let i = 0; i < LEN; i++) {
    const s = i / SR;
    let l = drums.L[i]! + bass.L[i]! + pad.L[i]! + pluck.L[i]! * 0.9 + reverb.L[i]!;
    let r = drums.R[i]! + bass.R[i]! + pad.R[i]! + pluck.R[i]! * 0.9 + reverb.R[i]!;
    if (i % 64 === 0) {
      const into = Math.min(1, Math.max(0, (s - (muteFrom - 0.3)) / 0.3));
      const cut = s > muteTo + 0.2 || s < muteFrom - 0.3 ? 18000 : 18000 * Math.pow(380 / 18000, into);
      lpL.set("lp", cut, 0.8); lpR.set("lp", cut, 0.8);
    }
    l = lpL.run(l); r = lpR.run(r);
    // through the wall: quieter as well as darker
    const wall = s > muteFrom - 0.3 && s < muteTo + 0.2 ? 0.55 : 1;
    l *= wall; r *= wall;
    // the silence between the scratch and the grind
    if (s > muteTo + 0.12 && s < sec(SCENES.grind.from)) { l *= 0; r *= 0; }
    const v = Math.max(Math.abs(voice.L[i]!), Math.abs(voice.R[i]!));
    const target = v > 0.02 ? 0.38 : 1;
    duckEnv += (target - duckEnv) * (target < duckEnv ? 0.0009 : 0.00012);
    music.L[i] = l * duckEnv; music.R[i] = r * duckEnv;
  }
}

// master: sum, gentle glue, soft clip, end fade, normalise to -1 dBFS
const outL = new Float32Array(LEN), outR = new Float32Array(LEN);
const endFade = sec(TOTAL) - 1.5;
for (let i = 0; i < LEN; i++) {
  const s = i / SR;
  let l = music.L[i]! * 0.9 + fx.L[i]! * 0.8 + voice.L[i]! * 1.0;
  let r = music.R[i]! * 0.9 + fx.R[i]! * 0.8 + voice.R[i]! * 1.0;
  const fade = s > endFade ? Math.pow(Math.max(0, 1 - (s - endFade) / 1.45), 1.6) : 1;
  outL[i] = Math.tanh(l * 1.1) * fade;
  outR[i] = Math.tanh(r * 1.1) * fade;
}
let peak = 0;
for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(outL[i]!), Math.abs(outR[i]!));
const g = 0.89 / peak;
const pcm = Buffer.alloc(LEN * 4);
for (let i = 0; i < LEN; i++) {
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i]! * g)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i]! * g)) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
writeFileSync(resolve("out/score.wav"), Buffer.concat([header, pcm]));
console.log(`score -> out/score.wav (${(LEN / SR).toFixed(1)} s, peak gain ${g.toFixed(2)})`);
