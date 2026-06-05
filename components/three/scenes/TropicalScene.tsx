"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ColorPalette } from "@/types";

interface Props {
  colorPalette: ColorPalette;
}

// Low-poly palm trunk + crown
function PalmTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
      groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.05 + position[1];
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 2, 6]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Crown — low-poly icosahedron */}
      <mesh position={[0, 1.2, 0]}>
        <icosahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#2D6A4F" roughness={0.7} flatShading />
      </mesh>
      {/* Coconuts */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <mesh key={i} position={[Math.cos(rad) * 0.4, 0.9, Math.sin(rad) * 0.4]}>
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshStandardMaterial color="#6B4226" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

// Gold particle field
function GoldParticles({ color }: { color: string }) {
  const count = 600;
  const meshRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.04} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// Ground plane
function TropicalGround({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

export default function TropicalScene({ colorPalette }: Props) {
  const primary = colorPalette?.primary ?? "#F59E0B";
  const accent  = colorPalette?.accent  ?? "#10B981";
  const bg      = colorPalette?.background ?? "#0A0F0A";

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 15, 35]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} color="#FFF8E1" />
      <directionalLight position={[5, 8, 3]} intensity={1.8} color={primary} castShadow />
      <pointLight position={[-3, 2, -3]} intensity={0.8} color={accent} />
      <hemisphereLight args={[primary, "#0A1A0A", 0.4]} />

      {/* Palm trees */}
      <PalmTree position={[0, -1.5, 0]} scale={1.2} />
      <PalmTree position={[-2.5, -1.5, -2]} scale={0.8} />
      <PalmTree position={[2.8, -1.5, -1.5]} scale={0.9} />
      <PalmTree position={[-1.5, -1.5, 1.5]} scale={0.7} />

      {/* Ground */}
      <TropicalGround color="#1A3A1A" />

      {/* Gold particles */}
      <GoldParticles color={primary} />
    </>
  );
}
