"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ColorPalette } from "@/types";

interface Props {
  colorPalette: ColorPalette;
}

const JUNGLE_GREENS = [
  "#1a472a", "#2d6a4f", "#40916c", "#52b788",
  "#74c69d", "#1B4332", "#081C15",
];

// Single depth-layer plane (semi-transparent foliage)
function FoliageLayer({
  z,
  color,
  opacity,
  layerIndex,
  mouseRef,
}: {
  z: number;
  color: string;
  opacity: number;
  layerIndex: number;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const ref = useRef<THREE.Mesh>(null);

  // Build a jagged plane with random vertex displacement
  const geo = useMemo(() => {
    const g    = new THREE.PlaneGeometry(20, 10, 20, 10);
    const pos  = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (Math.random() - 0.5) * 0.8);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    // Mouse parallax — layers move at different depths
    const strength = (layerIndex + 1) * 0.06;
    ref.current.position.x = THREE.MathUtils.lerp(
      ref.current.position.x,
      mouseRef.current.x * strength,
      0.05
    );
    ref.current.position.y = THREE.MathUtils.lerp(
      ref.current.position.y,
      mouseRef.current.y * strength * 0.5,
      0.05
    );
  });

  return (
    <mesh ref={ref} geometry={geo} position={[0, 0, z]}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Floating dust motes
function JungleDust({ color }: { color: string }) {
  const count = 500;
  const ref   = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      // Slow drift upward
      pos.setY(i, pos.getY(i) + 0.002);
      pos.setX(i, pos.getX(i) + Math.sin(clock.elapsedTime * 0.5 + i) * 0.001);
      if (pos.getY(i) > 5) pos.setY(i, -4);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.04} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// Mouse tracker — updated on pointer move
function MouseTracker({ mouseRef }: { mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const { gl } = useThree();

  useMemo(() => {
    const canvas = gl.domElement;
    function onMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouseRef.current.y = ((e.clientY - rect.top)  / rect.height - 0.5) * -2;
    }
    canvas.addEventListener("mousemove", onMove);
    return () => canvas.removeEventListener("mousemove", onMove);
  }, [gl, mouseRef]);

  return null;
}

export default function JungleScene({ colorPalette }: Props) {
  const primary = colorPalette?.primary ?? "#2D6A4F";
  const accent  = colorPalette?.accent  ?? "#74C69D";
  const bg      = colorPalette?.background ?? "#081C15";

  const mouseRef = useRef({ x: 0, y: 0 });

  // 6 depth layers from back (z=-5) to front (z=2)
  const layers = [
    { z: -5, color: JUNGLE_GREENS[6], opacity: 0.9 },
    { z: -3, color: JUNGLE_GREENS[0], opacity: 0.75 },
    { z: -1.5, color: JUNGLE_GREENS[1], opacity: 0.65 },
    { z: 0,  color: JUNGLE_GREENS[2], opacity: 0.55 },
    { z: 1.5, color: JUNGLE_GREENS[3], opacity: 0.45 },
    { z: 3,  color: JUNGLE_GREENS[4], opacity: 0.3  },
  ];

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 6, 18]} />

      {/* Dappled jungle light */}
      <ambientLight intensity={0.5} color="#A8F0C8" />
      <directionalLight position={[3, 8, 4]} intensity={1.2} color="#D4FFE8" />
      <pointLight position={[-2, 2, 1]} intensity={0.8} color={accent} />
      <spotLight position={[0, 8, -2]} angle={0.6} intensity={1} color={primary} penumbra={0.8} />

      <MouseTracker mouseRef={mouseRef} />

      {layers.map((l, i) => (
        <FoliageLayer
          key={i}
          z={l.z}
          color={l.color}
          opacity={l.opacity}
          layerIndex={i}
          mouseRef={mouseRef}
        />
      ))}

      <JungleDust color={accent} />
    </>
  );
}
