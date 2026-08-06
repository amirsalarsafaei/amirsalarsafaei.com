"use client";

import { extend, Object3DNode } from "@react-three/fiber";
import helvetiker from "three/examples/fonts/helvetiker_regular.typeface.json";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

declare module "@react-three/fiber" {
  interface ThreeElements {
    textGeometry: Object3DNode<TextGeometry, typeof TextGeometry>;
  }
}

extend({ TextGeometry });

const font = new FontLoader().parse(helvetiker);

export default function RoomEnvironment() {
  return (
    <group>
      <group position={[0, 0, 0]}>
        {Array.from({ length: 45 }).map((_, i) => {
          const scale = 0.05 + Math.random() * 0.09;
          const opacity = 0.15 + Math.random() * 0.2;
          return (
            <mesh
              key={`particle-${i}`}
              position={[
                Math.random() * 80 - 40,
                Math.random() * 24,
                Math.random() * 80 - 40,
              ]}
              scale={scale}
            >
              <sphereGeometry />
              <meshBasicMaterial
                color="#4CAF50"
                transparent
                opacity={opacity}
              />
            </mesh>
          );
        })}
      </group>

      {/* Floating wireframe shapes for depth — kept in the central open
          area so they don't spawn inside server racks (|x| ~ 30) or floor
          clutter (|x| > 22 near back). */}
      <group position={[0, 0, 0]}>
        {Array.from({ length: 3 }).map((_, i) => {
          // Keep |x| <= 20 and stay above rack tops (y >= 12) so shapes
          // don't intersect racks or pillars.
          const x = (Math.random() * 2 - 1) * 20;
          const z = (Math.random() * 2 - 1) * 20;
          const y = 12 + Math.random() * 10;
          return (
            <mesh
              key={`wire-box-${i}`}
              position={[x, y, z]}
              rotation={[
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
              ]}
              scale={0.6 + Math.random() * 1.2}
            >
              <boxGeometry />
              <meshBasicMaterial
                color="#4CAF50"
                wireframe
                transparent
                opacity={0.15}
              />
            </mesh>
          );
        })}
        {Array.from({ length: 2 }).map((_, i) => {
          const x = (Math.random() * 2 - 1) * 20;
          const z = (Math.random() * 2 - 1) * 20;
          const y = 12 + Math.random() * 10;
          return (
            <mesh
              key={`wire-oct-${i}`}
              position={[x, y, z]}
              rotation={[
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
              ]}
              scale={0.5 + Math.random() * 1.0}
            >
              <octahedronGeometry />
              <meshBasicMaterial
                color="#81C784"
                wireframe
                transparent
                opacity={0.18}
              />
            </mesh>
          );
        })}
      </group>

      {/* Floating Code Elements — small curated set so they're readable
          without hiding the room. */}
      <group position={[0, 0, 0]}>
        {[
          "cargo",
          "go mod",
          "grpc",
          "sqlx",
          "tokio",
          "nixos",
          "neovim",
          "impl",
          "Result<T,E>",
          "Arc<T>",
          "goroutine",
          "select!",
          "useState",
          "buf gen",
          "kubectl",
          ":wq",
        ].map((text, i) => {
          const size = 0.22 + Math.random() * 0.28;
          const opacity = 0.35 + Math.random() * 0.4;
          return (
            <group
              key={i}
              position={[
                Math.random() * 70 - 35,
                Math.random() * 22,
                Math.random() * 70 - 35,
              ]}
              rotation={[0, Math.random() * Math.PI - Math.PI / 2, 0]}
            >
              <mesh>
                <textGeometry
                  args={[
                    text,
                    {
                      font,
                      size,
                      depth: 0.03,
                      curveSegments: 12,
                      bevelEnabled: false,
                    },
                  ]}
                />
                <meshBasicMaterial
                  color="#4CAF50"
                  transparent
                  opacity={opacity}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
