"use client";

import { Suspense, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import StudioEnvironment from "../../playground/components/StudioEnvironment";
import styles from "../page.module.scss";

// Two free (CC BY) server-rack models from Sketchfab. The room is a small
// homelab vignette — the same machines the SSH terminal on this site runs on.
const RACKS = {
  row: "/models/sourced/NetworkServerRack/NetworkServerRack.glb",
} as const;

function Loading() {
  return (
    <div className={styles.loading}>
      <span>Loading 3D profile...</span>
    </div>
  );
}

function HeroRack() {
  const { scene } = useGLTF(RACKS.row);

  return (
    <primitive
      object={scene}
      position={[0, 0, 0]}
      rotation={[0, -0.35, 0]}
      scale={1.25}
    />
  );
}

// A slow drift keeps the still image alive without drawing attention to itself.
function Turntable({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.16;
  });

  return <group ref={ref}>{children}</group>;
}

export default function AboutMe3DCanvas() {
  return (
    <div className={styles.canvasContainer}>
      <Suspense fallback={<Loading />}>
        <Canvas
          camera={{ position: [4.4, 3.2, 7.8], fov: 38 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <color attach="background" args={["#070a09"]} />
          <fog attach="fog" args={["#070a09", 9, 24]} />
          <StudioEnvironment />

          <ambientLight intensity={0.35} />
          <directionalLight
            position={[4, 6, 5]}
            intensity={1.6}
            color="#d6f0e6"
          />
          <pointLight position={[-4, 2.4, 2]} intensity={8} color="#43d9ad" />
          <pointLight position={[3.5, 3.2, -3]} intensity={14} color="#4fc3f7" />

          <Turntable>
            <HeroRack />
          </Turntable>

          <Grid
            position={[0, -0.02, 0]}
            args={[24, 24]}
            cellSize={0.4}
            cellThickness={0.5}
            cellColor="#173a34"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#43d9ad"
            fadeDistance={18}
            fadeStrength={1.5}
            infiniteGrid
          />
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.5}
            scale={12}
            blur={2.4}
            far={6}
            color="#000000"
          />

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableRotate
            autoRotate
            autoRotateSpeed={0.5}
            minPolarAngle={Math.PI / 3.2}
            maxPolarAngle={Math.PI / 1.9}
          />
        </Canvas>
      </Suspense>
      <div className={styles.coreCaption}>
        <span>~/homelab</span>
        <span>rust · go · nixos</span>
      </div>
    </div>
  );
}
