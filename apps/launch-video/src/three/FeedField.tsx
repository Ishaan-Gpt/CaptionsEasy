import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { getRemotionEnvironment, staticFile, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import { NoReactInternals } from "remotion/no-react";
import { FPS } from "../theme";

export type FeedClip = { src: string; poster: string; durationSec: number };

export const CARD_W = 0.9;
export const CARD_H = CARD_W * (16 / 9);

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 12);
  // ShapeGeometry UVs are in shape units: normalize to 0..1 so a texture fills the card
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  uv.needsUpdate = true;
  return g;
}

const posterCache = new Map<string, THREE.Texture>();
const posterTexture = (poster: string) => {
  const hit = posterCache.get(poster);
  if (hit) return hit;
  const t = new THREE.TextureLoader().load(staticFile(poster));
  t.colorSpace = THREE.SRGBColorSpace;
  posterCache.set(poster, t);
  return t;
};

/**
 * Every card's video frame for this frame, loaded together. ThreeCanvas only redraws when the frame number
 * changes, so frames that arrive afterwards would never be drawn: we hold the frame (delayRender), load them all,
 * then redraw once (advance) before letting Remotion capture it.
 */
function useFrameTextures(urls: string[]): Map<string, THREE.Texture> {
  const { advance } = useThree();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [texs, setTexs] = useState<Map<string, THREE.Texture>>(() => new Map());
  const pending = useRef<number | null>(null);
  const key = urls.join("|");
  useLayoutEffect(() => {
    const h = delayRender("feed video frames");
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    Promise.all([...new Set(urls)].map((u) => loader.loadAsync(u).then((t) => [u, t] as const)))
      .then((pairs) => {
        if (cancelled) {
          pairs.forEach(([, t]) => t.dispose());
          continueRender(h);
          return;
        }
        for (const [, t] of pairs) t.colorSpace = THREE.SRGBColorSpace;
        pending.current = h;
        setTexs((old) => {
          old.forEach((t) => t.dispose());
          return new Map(pairs);
        });
      })
      .catch((e) => cancelRender(e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (pending.current === null) return;
    advance(performance.now());
    continueRender(pending.current);
    pending.current = null;
  }, [texs, advance, continueRender]);
  return texs;
}

export type FeedCamera = { pos: [number, number, number]; look: [number, number, number]; fov?: number; roll?: number };

export type FeedProps = {
  clips: FeedClip[];
  cols: number;
  rows: number;
  /** distance scrolled, in card pitches (speed-ramped by the scene) */
  scroll: number;
  /** per-column scroll multiplier (parallax); the hero column always moves at 1 */
  colSpeed?: number[];
  camera: FeedCamera;
  fog: string;
  fogNear?: number;
  fogFar?: number;
  dim?: number;
  /** the card the camera lands on: centred at y = 0 when scroll === landAt */
  hero?: { col: number; clip: number; landAt: number };
  gapX?: number;
  gapY?: number;
  bezel?: string;
  /** frame offset for clip playback so act 1 and act 4 never show the same moments */
  seed?: number;
};

/**
 * The endless short-video feed as a 3D wall: columns of phones scrolling upward and a camera that flies over
 * them. Everything is a pure function of the frame and the props (no useFrame), as Remotion requires.
 */
export const FeedField: React.FC<FeedProps> = (p) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true }} style={{ position: "absolute", inset: 0 }}>
      <Scene {...p} />
    </ThreeCanvas>
  );
};

const Scene: React.FC<FeedProps> = ({ clips, cols, rows, scroll, colSpeed, camera, fog, fogNear = 4, fogFar = 16, dim = 0.85, hero, gapX = 0.16, gapY = 0.2, bezel = "#111110", seed = 0 }) => {
  const { camera: cam, scene } = useThree();
  const frame = useCurrentFrame();
  const cardGeo = useMemo(() => roundedRect(CARD_W, CARD_H, 0.075), []);
  const bezelGeo = useMemo(() => roundedRect(CARD_W + 0.05, CARD_H + 0.05, 0.1), []);
  const fogObj = useMemo(() => new THREE.Fog(fog, fogNear, fogFar), [fog, fogNear, fogFar]);
  const bg = useMemo(() => new THREE.Color(fog), [fog]);
  const tint = useMemo(() => new THREE.Color(dim, dim, dim), [dim]);
  const bezelMat = useMemo(() => new THREE.MeshBasicMaterial({ color: bezel }), [bezel]);

  useLayoutEffect(() => {
    const c = cam as THREE.PerspectiveCamera;
    c.fov = camera.fov ?? 38;
    c.near = 0.05;
    c.far = 60;
    c.position.set(...camera.pos);
    c.up.set(Math.sin(camera.roll ?? 0), Math.cos(camera.roll ?? 0), 0);
    c.lookAt(new THREE.Vector3(...camera.look));
    c.updateProjectionMatrix();
    scene.fog = fogObj;
    scene.background = bg;
  });

  const pitchX = CARD_W + gapX;
  const pitchY = CARD_H + gapY;
  const wallH = rows * pitchY;
  const lookY = camera.look[1];
  const slots: { key: string; x: number; y: number; clip: number; phase: number }[] = [];
  for (let c = 0; c < cols; c++) {
    const x = (c - (cols - 1) / 2) * pitchX;
    if (hero && c === hero.col) {
      // the hero column does not wrap: card k sits k pitches above the hero, which lands at y = 0
      const lo = -Math.ceil(hero.landAt) - rows;
      for (let k = lo; k <= rows; k++) {
        const y = (k + scroll - hero.landAt) * pitchY;
        if (Math.abs(y - lookY) > wallH) continue;
        slots.push({ key: `h${k}`, x, y, clip: k === 0 ? hero.clip : Math.abs(c * 5 + k * 3) % clips.length, phase: Math.abs(k) * 1.3 });
      }
      continue;
    }
    const speed = colSpeed?.[c] ?? 1;
    for (let r = 0; r < rows; r++) {
      let y = (rows / 2 - r) * pitchY + scroll * pitchY * speed;
      y = ((((y + wallH / 2) % wallH) + wallH) % wallH) - wallH / 2;
      slots.push({ key: `${c}-${r}`, x, y, clip: (c * 7 + r * 3) % clips.length, phase: c * 1.7 + r * 2.3 });
    }
  }

  const rendering = getRemotionEnvironment().isRendering;
  // each card's media time, snapped to the clip's 30 fps so copies at the same moment share one frame
  const timed = slots.map((sl) => {
    const clip = clips[sl.clip]!;
    const len = Math.max(0.5, clip.durationSec - 0.3);
    const t = Math.floor(((((frame + seed) / FPS + sl.phase) % len + len) % len) * 30) / 30;
    return { ...sl, clip, url: rendering ? NoReactInternals.getOffthreadVideoSource({ src: staticFile(clip.src), currentTime: t, transparent: false, toneMapped: true }) : clip.poster };
  });
  return <Cards slots={timed} cardGeo={cardGeo} bezelGeo={bezelGeo} bezelMat={bezelMat} tint={tint} rendering={rendering} />;
};

const Cards: React.FC<{
  slots: { key: string; x: number; y: number; url: string; clip: FeedClip }[];
  cardGeo: THREE.BufferGeometry;
  bezelGeo: THREE.BufferGeometry;
  bezelMat: THREE.Material;
  tint: THREE.Color;
  rendering: boolean;
}> = ({ slots, cardGeo, bezelGeo, bezelMat, tint, rendering }) => {
  const live = useFrameTextures(rendering ? slots.map((s) => s.url) : []);
  return (
    <>
      {slots.map((s) => {
        const tex = rendering ? live.get(s.url) ?? null : posterTexture(s.clip.poster);
        return (
          <group key={s.key} position={[s.x, s.y, 0]}>
            <mesh geometry={bezelGeo} material={bezelMat} position={[0, 0, -0.002]} />
            <mesh geometry={cardGeo}>
              <meshBasicMaterial key={tex ? "tex" : "none"} map={tex ?? undefined} color={tint} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};
