"use client";

import { useRef, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneType, ColorPalette } from "@/types";

// Lazy-load scenes to keep bundle split clean
import dynamic from "next/dynamic";

const SCENES = {
  tropical: dynamic(() => import("./scenes/TropicalScene")),
  coastal:  dynamic(() => import("./scenes/CoastalScene")),
  urban:    dynamic(() => import("./scenes/UrbanScene")),
  mountain: dynamic(() => import("./scenes/MountainScene")),
  jungle:   dynamic(() => import("./scenes/JungleScene")),
} as const;

// ─── camera fly-in ────────────────────────────────────────────────────────────
// Animates camera from a far position to the natural resting position over 3s.

const START_POSITIONS: Record<SceneType, [number, number, number]> = {
  tropical: [0, 8, 20],
  coastal:  [0, 12, 18],
  urban:    [10, 12, 14],
  mountain: [-8, 10, 16],
  jungle:   [0, 5, 14],
};

const END_POSITIONS: Record<SceneType, [number, number, number]> = {
  tropical: [0, 2, 8],
  coastal:  [0, 4, 9],
  urban:    [4, 5, 8],
  mountain: [-3, 3, 9],
  jungle:   [0, 1, 6],
};

function CameraFlyIn({ sceneType }: { sceneType: SceneType }) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const done    = useRef(false);
  const DURATION = 3; // seconds

  const start = new THREE.Vector3(...START_POSITIONS[sceneType]);
  const end   = new THREE.Vector3(...END_POSITIONS[sceneType]);

  // Set initial position immediately on mount
  useEffect(() => {
    camera.position.copy(start);
    camera.lookAt(0, 0, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = Math.min(elapsed.current / DURATION, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(start, end, ease);
    camera.lookAt(0, 0, 0);
    if (t >= 1) done.current = true;
  });

  return null;
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  sceneType: SceneType;
  colorPalette: ColorPalette;
  className?: string;
}

export default function WebsiteCanvas({ sceneType, colorPalette, className }: Props) {
  const SceneComponent = SCENES[sceneType] ?? SCENES.tropical;

  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      camera={{ fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
    >
      <CameraFlyIn sceneType={sceneType} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SceneComponent colorPalette={colorPalette as any} />
    </Canvas>
  );
}
