import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { C } from "../theme";

/** The app icon (brand/captionseasy-icon.svg) in 100-unit space: x, top, height. Width 14, fully rounded. */
const BARS: { x: number; top: number; h: number; color: string }[] = [
  { x: 20, top: 42, h: 48, color: C.ink },
  { x: 43, top: 10, h: 80, color: C.orange },
  { x: 66, top: 26, h: 64, color: C.emerald },
];

function stadium(w: number, h: number, depth: number) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, -h / 2 + r);
  s.lineTo(-r, h / 2 - r);
  s.absarc(0, h / 2 - r, r, Math.PI, 0, true);
  s.lineTo(r, -h / 2 + r);
  s.absarc(0, -h / 2 + r, r, 0, Math.PI, true);
  const bevel = depth * 0.35;
  const g = new THREE.ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 10, curveSegments: 40 });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return g;
}

export type LogoPose = {
  /** 0→1 growth of each bar (springs from the scene) */
  rise: [number, number, number];
  rotX: number;
  rotY: number;
  rotZ?: number;
  /** extra lift per bar (audio-meter bounce) */
  bounce?: [number, number, number];
};

const Bars: React.FC<LogoPose> = ({ rise, rotX, rotY, rotZ = 0, bounce = [0, 0, 0] }) => {
  const { gl, scene, camera } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    pm.dispose();
    return t;
  }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env;
    const c = camera as THREE.PerspectiveCamera;
    c.fov = 30;
    c.position.set(0, 0, 4.2);
    c.lookAt(0, 0, 0);
    c.updateProjectionMatrix();
  });
  const geos = useMemo(() => BARS.map((b) => stadium(0.14 * 2.4, (b.h / 100) * 2.4, 0.2 * 2.4)), []);
  const mats = useMemo(
    () => BARS.map((b) => new THREE.MeshPhysicalMaterial({ color: b.color, roughness: b.color === C.ink ? 0.32 : 0.24, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.3 })),
    [],
  );
  const U = 2.4 / 100;
  return (
    <group rotation={[rotX, rotY, rotZ]}>
      {BARS.map((b, i) => {
        const h = b.h * U;
        const g = Math.max(0.001, rise[i]!);
        // bars grow from their bottom edge (y = 90 in icon space)
        const bottom = (50 - 90) * U;
        const cy = bottom + (h * g) / 2 + bounce[i]! * U * 6;
        const x = (b.x + 7 - 50) * U;
        return <mesh key={i} geometry={geos[i]} material={mats[i]} position={[x, cy, 0]} scale={[1, g, 1]} />;
      })}
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight position={[-4, -1, 2]} intensity={0.5} color={C.lavender} />
      <ambientLight intensity={0.2} />
    </group>
  );
};

/** A self-contained transparent canvas so the 3D icon can be placed and moved like any HTML element. */
export const LogoIcon3D: React.FC<LogoPose & { size: number }> = ({ size, ...pose }) => (
  <ThreeCanvas width={size} height={size} flat gl={{ antialias: true, alpha: true, premultipliedAlpha: false }} style={{ width: size, height: size }}>
    <Bars {...pose} />
  </ThreeCanvas>
);
