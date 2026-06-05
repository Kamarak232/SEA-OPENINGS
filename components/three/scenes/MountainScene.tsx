"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ColorPalette } from "@/types";

interface Props {
  colorPalette: ColorPalette;
}

// Pseudo-noise via layered sines — no extra dep needed
function noise(x: number, y: number): number {
  return (
    Math.sin(x * 1.3 + y * 0.7) * 0.5 +
    Math.sin(x * 2.7 + y * 1.8) * 0.25 +
    Math.sin(x * 5.1 + y * 3.2) * 0.125 +
    Math.cos(x * 0.9 + y * 2.3) * 0.25
  );
}

function TerrainMesh({ color, wireColor }: { color: string; wireColor: string }) {
  const solidRef = useRef<THREE.Mesh>(null);
  const wireRef  = useRef<THREE.Mesh>(null);
  const SEGS     = 60;

  const geo = useMemo(() => {
    const g   = new THREE.PlaneGeometry(20, 20, SEGS, SEGS);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, noise(x * 0.4, y * 0.4) * 2.5);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  // Slow drift
  useFrame(({ clock }) => {
    if (solidRef.current) {
      solidRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.1) * 0.02;
    }
  });

  return (
    <>
      <mesh
        ref={solidRef}
        geometry={geo}
        rotation={[-Math.PI / 2.4, 0, 0]}
        position={[0, -2, -2]}
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      <mesh
        ref={wireRef}
        geometry={geo}
        rotation={[-Math.PI / 2.4, 0, 0]}
        position={[0, -1.98, -2]}
      >
        <meshBasicMaterial color={wireColor} wireframe transparent opacity={0.12} />
      </mesh>
    </>
  );
}

// Snow peaks — small icosahedra at high points
function Peaks({ color }: { color: string }) {
  const peaks = useMemo(() =>
    Array.from({ length: 6 }, () => ({
      x: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
      scale: 0.2 + Math.random() * 0.3,
    })), []);

  return (
    <>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, 0.8, p.z]} scale={p.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} roughness={0.4} flatShading />
        </mesh>
      ))}
    </>
  );
}

// Atmospheric particles — like snow/mist
function MistParticles({ color }: { color: string }) {
  const count = 300;
  const ref   = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8 + 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      pos.setX(i, pos.getX(i) + Math.sin(clock.elapsedTime * 0.3 + i) * 0.002);
      pos.setY(i, pos.getY(i) - 0.003);
      if (pos.getY(i) < -3) pos.setY(i, 5);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.06} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export default function MountainScene({ colorPalette }: Props) {
  const primary = colorPalette?.primary ?? "#4A90D9";
  const accent  = colorPalette?.accent  ?? "#93C5FD";
  const bg      = colorPalette?.background ?? "#050A14";

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 8, 25]} />

      {/* Cool blue lighting */}
      <ambientLight intensity={0.35} color="#B0C8FF" />
      <directionalLight position={[-5, 10, 3]} intensity={1.4} color="#DDEEFF" castShadow />
      <pointLight position={[0, 4, 2]} intensity={0.8} color={primary} />
      <hemisphereLight args={[accent, bg, 0.4]} />

      <TerrainMesh color={primary} wireColor={accent} />
      <Peaks color="#F0F8FF" />
      <MistParticles color={accent} />
    </>
  );
}
