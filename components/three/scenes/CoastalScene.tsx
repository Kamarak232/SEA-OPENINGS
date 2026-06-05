"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ColorPalette } from "@/types";

interface Props {
  colorPalette: ColorPalette;
}

const GRID = 80; // wave resolution

function OceanPlane({ color }: { color: string; accent?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geo     = useMemo(() => new THREE.PlaneGeometry(20, 20, GRID, GRID), []);

  useFrame(({ clock }) => {
    const t   = clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z =
        Math.sin(x * 0.6 + t * 1.2) * 0.3 +
        Math.sin(y * 0.4 + t * 0.9) * 0.25 +
        Math.sin((x + y) * 0.3 + t * 0.7) * 0.15;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.1}
        metalness={0.4}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Foam particles that float above the water
function SeaSpray({ color }: { color: string }) {
  const count = 400;
  const ref   = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds    = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
      speeds[i] = 0.3 + Math.random() * 0.7;
    }
    return { positions, speeds };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const y = pos.getY(i) + speeds[i] * 0.005;
      pos.setY(i, y > 2.5 ? 0 : y);
    }
    pos.needsUpdate = true;
    ref.current.rotation.y = clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.05} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// Horizon glow sphere
function HorizonGlow({ color }: { color: string }) {
  return (
    <mesh position={[0, -2, -12]}>
      <sphereGeometry args={[4, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.BackSide} />
    </mesh>
  );
}

export default function CoastalScene({ colorPalette }: Props) {
  const primary = colorPalette?.primary ?? "#0EA5E9";
  const accent  = colorPalette?.accent  ?? "#67E8F9";
  const bg      = colorPalette?.background ?? "#020B18";

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 12, 30]} />

      {/* Lighting */}
      <ambientLight intensity={0.4} color="#B0E8FF" />
      <directionalLight position={[0, 10, 5]} intensity={1.5} color="#FFFFFF" />
      <pointLight position={[0, 2, 0]} intensity={1.2} color={accent} />
      <hemisphereLight args={[primary, bg, 0.5]} />

      <OceanPlane color={primary} />
      <SeaSpray color={accent} />
      <HorizonGlow color={accent} />
    </>
  );
}
