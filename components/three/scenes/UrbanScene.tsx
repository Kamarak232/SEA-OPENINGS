"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ColorPalette } from "@/types";

interface Props {
  colorPalette: ColorPalette;
}

interface BuildingProps {
  position: [number, number, number];
  height: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
}

function Building({ position, height, color, emissive, emissiveIntensity }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      // Flicker windows
      mat.emissiveIntensity = emissiveIntensity + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[position[0], height / 2 + position[1], position[2]]} castShadow>
      <boxGeometry args={[0.6, height, 0.6]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.3}
        metalness={0.6}
      />
    </mesh>
  );
}

// Neon grid lines on the ground
function GroundGrid({ color }: { color: string }) {
  return (
    <gridHelper args={[30, 30, color, color]} position={[0, -0.5, 0]}>
      <lineBasicMaterial color={color} transparent opacity={0.2} />
    </gridHelper>
  );
}

// Flying lights
function CityLights({ color }: { color: string }) {
  const count  = 80;
  const ref    = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = Math.random() * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.08} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function CityBlock({ color, emissive }: { color: string; emissive: string }) {
  const buildings = useMemo(() => {
    const out: BuildingProps[] = [];
    for (let x = -4; x <= 4; x += 2) {
      for (let z = -4; z <= 4; z += 2) {
        // Skip center cluster for camera view
        if (Math.abs(x) < 1 && Math.abs(z) < 1) continue;
        out.push({
          position: [x + (Math.random() - 0.5) * 0.4, -0.5, z + (Math.random() - 0.5) * 0.4],
          height: 1.5 + Math.random() * 4,
          color,
          emissive,
          emissiveIntensity: 0.2 + Math.random() * 0.4,
        });
      }
    }
    return out;
  }, [color, emissive]);

  return (
    <>
      {buildings.map((b, i) => <Building key={i} {...b} />)}
    </>
  );
}

export default function UrbanScene({ colorPalette }: Props) {
  const primary = colorPalette?.primary ?? "#3B82F6";
  const accent  = colorPalette?.accent  ?? "#818CF8";
  const bg      = colorPalette?.background ?? "#020212";

  // Dim city-base colour
  const cityColor    = "#0D1B2A";
  const emissiveColor = primary;

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 10, 28]} />

      {/* Lighting — cool, neon */}
      <ambientLight intensity={0.2} color="#1A1A3E" />
      <pointLight position={[0, 6, 0]} intensity={2} color={primary} />
      <pointLight position={[-4, 3, 4]} intensity={1} color={accent} />
      <spotLight
        position={[0, 12, 0]}
        angle={0.4}
        penumbra={0.8}
        intensity={1.5}
        color={accent}
        castShadow
      />

      {/* Slow auto-rotate via orbit */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
      />

      <CityBlock color={cityColor} emissive={emissiveColor} />
      <GroundGrid color={primary} />
      <CityLights color={accent} />
    </>
  );
}
