"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import FloatingProfileCard from "./FloatingProfileCard";
import styles from "../page.module.scss";

function Loading() {
  return (
    <div className={styles.loading}>
      <span>Loading 3D profile...</span>
    </div>
  );
}

export default function AboutMe3DCanvas() {
  return (
    <div className={styles.canvasContainer}>
      <Suspense fallback={<Loading />}>
        <Canvas
          camera={{
            position: [0, 0, 10],
            fov: 42,
          }}
        >
          <CpuMulticoreConcurrency />
          <CodeOrbit />

          <ambientLight intensity={0.55} />
          <pointLight position={[6, 6, 7]} intensity={1.4} color="#43d9ad" />
          <pointLight position={[-6, -4, 6]} intensity={0.8} color="#7f5af0" />
          <directionalLight position={[5, 5, 5]} intensity={0.45} castShadow />

          <group scale={0.62}>
            <FloatingProfileCard />
          </group>

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableRotate={true}
            autoRotate
            autoRotateSpeed={0.6}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Canvas>
      </Suspense>
      <div className={styles.coreCaption}>
        <span>~4.0 GHz</span>
        <span>spawning threads…</span>
      </div>
    </div>
  );
}

const CORE_COLS = 4;
const CORE_ROWS = 2;
const CORE_COUNT = CORE_COLS * CORE_ROWS;
const CORE_SPACING_X = 1.7;
const CORE_SPACING_Y = 1.7;

function CpuMulticoreConcurrency() {
  const cores = useMemo(
    () =>
      Array.from({ length: CORE_COUNT }, (_, index) => {
        const col = index % CORE_COLS;
        const row = Math.floor(index / CORE_COLS);
        return {
          index,
          position: [
            (col - (CORE_COLS - 1) / 2) * CORE_SPACING_X,
            ((CORE_ROWS - 1) / 2 - row) * CORE_SPACING_Y,
            -3.8,
          ] as [number, number, number],
          // each core runs its own concurrent workload at a different cadence
          speed: 0.9 + (index % 4) * 0.45,
          phase: index * 1.27,
        };
      }),
    [],
  );

  return (
    <group>
      {cores.map((core) => (
        <CpuCore key={core.index} {...core} />
      ))}
      <ConcurrentTasks cores={cores} />
    </group>
  );
}

function CpuCore({
  position,
  speed,
  phase,
}: {
  position: [number, number, number];
  speed: number;
  phase: number;
}) {
  const dieRef = useRef<THREE.MeshStandardMaterial>(null);
  const loadRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    // simulate fluctuating per-core utilization
    const load = 0.5 + 0.5 * Math.sin(t);
    if (dieRef.current) {
      dieRef.current.emissiveIntensity = 0.15 + load * 0.85;
    }
    if (loadRef.current) {
      loadRef.current.scale.y = 0.08 + load * 0.95;
      loadRef.current.position.y =
        position[1] - 0.45 + (0.08 + load * 0.95) / 2;
    }
  });

  return (
    <group>
      <mesh position={position}>
        <boxGeometry args={[1.1, 1.1, 0.12]} />
        <meshStandardMaterial
          ref={dieRef}
          color="#062b3a"
          emissive="#43d9ad"
          emissiveIntensity={0.3}
          metalness={0.6}
          roughness={0.35}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* core border frame */}
      <mesh position={[position[0], position[1], position[2] - 0.02]}>
        <boxGeometry args={[1.24, 1.24, 0.06]} />
        <meshStandardMaterial
          color="#7f5af0"
          emissive="#7f5af0"
          emissiveIntensity={0.25}
          transparent
          opacity={0.18}
          wireframe
        />
      </mesh>
      {/* utilization bar */}
      <mesh
        ref={loadRef}
        position={[position[0] + 0.42, position[1], position[2] + 0.1]}
      >
        <boxGeometry args={[0.14, 1, 0.14]} />
        <meshStandardMaterial
          color="#4eff91"
          emissive="#4eff91"
          emissiveIntensity={0.7}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

function ConcurrentTasks({
  cores,
}: {
  cores: { position: [number, number, number] }[];
}) {
  const tasks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        index,
        from: index % cores.length,
        to: (index * 3 + 1) % cores.length,
        speed: 0.35 + (index % 5) * 0.12,
        offset: index * 0.41,
        color: index % 3 === 0 ? "#7f5af0" : "#43d9ad",
      })),
    [cores.length],
  );

  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    tasks.forEach((task, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const from = cores[task.from].position;
      const to = cores[task.to].position;
      // ping-pong progress to show data passing between cores concurrently
      const p =
        (Math.sin(clock.elapsedTime * task.speed + task.offset) + 1) / 2;
      mesh.position.x = from[0] + (to[0] - from[0]) * p;
      mesh.position.y = from[1] + (to[1] - from[1]) * p;
      mesh.position.z = -3.7 + Math.sin(p * Math.PI) * 0.6;
    });
  });

  return (
    <group>
      {tasks.map((task, i) => (
        <mesh
          key={task.index}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial
            color={task.color}
            emissive={task.color}
            emissiveIntensity={0.9}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

function CodeOrbit() {
  const groupRef = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        angle: (index / 28) * Math.PI * 2,
        radius: 3.6 + (index % 5) * 0.18,
        height: ((index % 7) - 3) * 0.34,
        color: index % 3 === 0 ? "#7f5af0" : "#43d9ad",
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = clock.elapsedTime * 0.045;
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, index) => (
        <mesh
          key={index}
          position={[
            Math.cos(node.angle) * node.radius,
            node.height,
            Math.sin(node.angle) * node.radius - 1.2,
          ]}
        >
          <boxGeometry args={[0.06, 0.06, 0.06]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}
