"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";

const FONT_MONO = "/fonts/JetBrainsMono-Regular.ttf";
const FONT_MONO_BOLD = "/fonts/JetBrainsMono-Bold.ttf";

// Vertex shader shared by all animated surfaces — just passes UV through.
const passUvVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Animated grid with a pulsing scan sweep — used on the ceiling.
const gridScanFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec2 uCells;
  varying vec2 vUv;
  void main() {
    vec2 grid = abs(fract(vUv * uCells) - 0.5);
    float line = min(grid.x, grid.y);
    float mask = smoothstep(0.02, 0.0, line);
    // Diagonal scan sweep
    float sweep = sin((vUv.x + vUv.y) * 6.2831 - uTime * 0.8) * 0.5 + 0.5;
    sweep = pow(sweep, 6.0);
    float alpha = mask * (0.18 + sweep * 0.55);
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// Vertical scanlines drifting upward — used as wall accent panels.
const scanlineFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float scan = sin(vUv.y * 60.0 - uTime * 2.0) * 0.5 + 0.5;
    scan = pow(scan, 3.0);
    float glow = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    float edge = smoothstep(0.05, 0.0, min(vUv.x, 1.0 - vUv.x));
    float alpha = (scan * 0.4 + edge * 0.6) * glow;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const AnimatedGridSurface = ({
  width,
  height,
  cellsX,
  cellsY,
  color,
}: {
  width: number;
  height: number;
  cellsX: number;
  cellsY: number;
  color: string;
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uCells: { value: new THREE.Vector2(cellsX, cellsY) },
    }),
    [color, cellsX, cellsY],
  );
  useFrame((state) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime as { value: number }).value =
        state.clock.elapsedTime;
    }
  });
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={passUvVertex}
        fragmentShader={gridScanFragment}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

const AnimatedScanlinePanel = ({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color],
  );
  useFrame((state) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime as { value: number }).value =
        state.clock.elapsedTime;
    }
  });
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={passUvVertex}
        fragmentShader={scanlineFragment}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

type Rack = {
  position: [number, number, number];
  height: number;
  width?: number;
  depth?: number;
  rotationY?: number;
  ledColor?: string;
  label?: string;
  sublabel?: string;
};

// Labels reference the kind of infra a Rust/Go dev running nixos + a
// personal SSH-accessible site would plausibly have.
const RACKS: Rack[] = [
  { position: [-30, 0, -18], height: 11, ledColor: "#00ff41", label: "hetzner-01", sublabel: "prod :: web+api" },
  { position: [-30, 0, -12], height: 9, ledColor: "#4CAF50", label: "hetzner-02", sublabel: "prod :: postgres" },
  { position: [-30, 0, -6], height: 10, ledColor: "#00ff88", label: "rpi-cluster", sublabel: "k3s :: 4 nodes" },
  { position: [30, 0, -18], height: 11, ledColor: "#00ff41", label: "dev-nixos", sublabel: "amd 7950x :: 64gb" },
  { position: [30, 0, -12], height: 9, ledColor: "#4CAF50", label: "nas-01", sublabel: "zfs :: 24 tb" },
  { position: [30, 0, -6], height: 10, ledColor: "#00ff88", label: "gpu-lab", sublabel: "rtx 4090 :: cuda" },
  { position: [-30, 0, 8], height: 8, ledColor: "#00ff41", label: "monitor", sublabel: "prom + grafana" },
  { position: [30, 0, 12], height: 9, ledColor: "#4CAF50", label: "backup", sublabel: "restic :: b2" },
  { position: [-22, 0, -26], height: 10, rotationY: Math.PI / 2, ledColor: "#00ff88", label: "sqlx-cache", sublabel: "offline queries" },
  { position: [-14, 0, -26], height: 8, rotationY: Math.PI / 2, ledColor: "#4CAF50", label: "buf-gen", sublabel: "grpc :: tonic" },
  { position: [14, 0, -26], height: 10, rotationY: Math.PI / 2, ledColor: "#00ff41", label: "spotify-svc", sublabel: "now-playing" },
  { position: [22, 0, -26], height: 8, rotationY: Math.PI / 2, ledColor: "#00ff88", label: "img-upload", sublabel: "sharp :: docker" },
];

const ServerRack = ({ rack }: { rack: Rack }) => {
  const width = rack.width ?? 3;
  const depth = rack.depth ?? 2;
  const [x, , z] = rack.position;

  const ledRows = Math.max(4, Math.floor(rack.height * 1.2));

  return (
    <group position={[x, rack.height / 2, z]} rotation={[0, rack.rotationY ?? 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, rack.height, depth]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* Front panel inset */}
      <mesh position={[0, 0, depth / 2 + 0.01]}>
        <planeGeometry args={[width * 0.85, rack.height * 0.95]} />
        <meshStandardMaterial color="#050505" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* LED strips */}
      {Array.from({ length: ledRows }).map((_, i) => {
        const y = rack.height / 2 - 0.5 - i * (rack.height / (ledRows + 1));
        return (
          <group key={i} position={[0, y, depth / 2 + 0.05]}>
            {Array.from({ length: 3 }).map((_, j) => (
              <mesh key={j} position={[(j - 1) * 0.6, 0, 0]}>
                <boxGeometry args={[0.12, 0.08, 0.02]} />
                <meshBasicMaterial
                  color={
                    (i + j) % 5 === 0
                      ? rack.ledColor ?? "#00ff41"
                      : (i + j) % 3 === 0
                        ? "#ffb000"
                        : "#003d0f"
                  }
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* Vent slats */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`vent-${i}`}
          position={[0, -rack.height / 2 + 0.4 + i * 0.15, depth / 2 + 0.02]}
        >
          <planeGeometry args={[width * 0.6, 0.05]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Handle knobs — small metallic circles top corners */}
      {[-0.9, 0.9].map((sx, i) => (
        <mesh
          key={`knob-${i}`}
          position={[sx, rack.height / 2 - 0.3, depth / 2 + 0.06]}
        >
          <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {/* Label plate near top of rack */}
      {rack.label && (
        <group position={[0, rack.height / 2 - 0.9, depth / 2 + 0.08]}>
          <mesh>
            <planeGeometry args={[width * 0.72, 0.55]} />
            <meshStandardMaterial color="#0a1a0a" metalness={0.4} roughness={0.6} />
          </mesh>
          <Text
            position={[0, 0.09, 0.01]}
            fontSize={0.18}
            color={rack.ledColor ?? "#00ff41"}
            font={FONT_MONO_BOLD}
            anchorX="center"
            anchorY="middle"
          >
            {rack.label}
          </Text>
          {rack.sublabel && (
            <Text
              position={[0, -0.14, 0.01]}
              fontSize={0.11}
              color="#88aa88"
              font={FONT_MONO}
              anchorX="center"
              anchorY="middle"
            >
              {rack.sublabel}
            </Text>
          )}
        </group>
      )}
    </group>
  );
};

const CornerPillar = ({
  position,
  height = 40,
}: {
  position: [number, number, number];
  height?: number;
}) => {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, height, 1.2]} />
        <meshStandardMaterial color="#0d1a12" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Vertical accent strip */}
      <mesh position={[0, 0, 0.62]}>
        <planeGeometry args={[0.15, height * 0.85]} />
        <meshBasicMaterial color="#00ff41" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.62, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.15, height * 0.85]} />
        <meshBasicMaterial color="#00ff41" transparent opacity={0.55} />
      </mesh>
    </group>
  );
};

const CeilingTruss = ({
  position,
  length,
  rotationY = 0,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Main beam */}
      <mesh>
        <boxGeometry args={[length, 0.4, 0.6]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Bracing */}
      {Array.from({ length: Math.floor(length / 3) }).map((_, i) => (
        <mesh
          key={i}
          position={[-length / 2 + 1.5 + i * 3, -0.5, 0]}
          rotation={[0, 0, Math.PI / 4]}
        >
          <boxGeometry args={[1.2, 0.1, 0.4]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

const FloorCrate = ({
  position,
  size = 1.6,
  rotationY = 0,
}: {
  position: [number, number, number];
  size?: number;
  rotationY?: number;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color="#1a2a1a" metalness={0.3} roughness={0.8} />
      </mesh>
      {/* Bracket edges */}
      {[
        [size / 2 + 0.01, 0, 0],
        [-size / 2 - 0.01, 0, 0],
        [0, 0, size / 2 + 0.01],
        [0, 0, -size / 2 - 0.01],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <planeGeometry args={[size * 0.9, 0.08]} />
          <meshBasicMaterial color="#4CAF50" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
};

const CableRun = ({
  position,
  length,
  rotationY = 0,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[length, 0.2, 0.5]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.6} />
      </mesh>
      {/* Cables inside */}
      {[-0.15, -0.05, 0.05, 0.15].map((offset, i) => (
        <mesh key={i} position={[0, 0.05, offset]}>
          <boxGeometry args={[length, 0.05, 0.04]} />
          <meshBasicMaterial
            color={
              i === 0
                ? "#00ff41"
                : i === 1
                  ? "#ffb000"
                  : i === 2
                    ? "#00ffff"
                    : "#ff4444"
            }
          />
        </mesh>
      ))}
    </group>
  );
};

const HoloPanel = ({
  position,
  rotationY,
  width = 6,
  height = 4,
  color = "#00ff41",
  title,
}: {
  position: [number, number, number];
  rotationY: number;
  width?: number;
  height?: number;
  color?: string;
  title?: string;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[width + 0.3, height + 0.3, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#031008" />
      </mesh>
      {/* Fake data lines — anchored to left edge, clamped to inner area */}
      {Array.from({ length: 10 }).map((_, i) => {
        const innerW = width - 0.8; // padding both sides
        const lineW = innerW * (0.3 + Math.random() * 0.6);
        const y = height / 2 - 0.9 - i * ((height - 2) / 12);
        // Skip lines that would fall inside the bar chart area at bottom.
        if (y < -height / 2 + height * 0.4 + 0.1) return null;
        return (
          <mesh
            key={`line-${i}`}
            position={[-width / 2 + 0.4 + lineW / 2, y, 0.07]}
          >
            <planeGeometry args={[lineW, 0.08]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.5 + Math.random() * 0.4}
            />
          </mesh>
        );
      })}
      {/* Header bar + title text — sits inside the frame */}
      <mesh position={[0, height / 2 - 0.2, 0.07]}>
        <planeGeometry args={[width - 0.3, 0.28]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      {title && (
        <Text
          position={[-width / 2 + 0.35, height / 2 - 0.2, 0.08]}
          fontSize={0.16}
          color="#031008"
          font={FONT_MONO_BOLD}
          anchorX="left"
          anchorY="middle"
        >
          {title}
        </Text>
      )}
      {/* Bottom bar chart — anchored to left, contained under the frame */}
      {(() => {
        const chartArea = width - 0.8;
        const bars = 8;
        const step = chartArea / bars;
        const barW = step * 0.7;
        const maxBarH = Math.min(height * 0.35, 1.2);
        return Array.from({ length: bars }).map((_, i) => {
          const h = 0.2 + Math.random() * maxBarH;
          return (
            <mesh
              key={`bar-${i}`}
              position={[
                -width / 2 + 0.4 + i * step + step / 2,
                -height / 2 + 0.3 + h / 2,
                0.07,
              ]}
            >
              <planeGeometry args={[barW, h]} />
              <meshBasicMaterial color={color} transparent opacity={0.75} />
            </mesh>
          );
        });
      })()}
    </group>
  );
};

const CeilingDuct = ({
  position,
  length,
  rotationY = 0,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[length, 1.2, 1.2]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Segment rings */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
        <mesh
          key={i}
          position={[-length / 2 + 1 + i * 2, 0, 0]}
        >
          <boxGeometry args={[0.1, 1.35, 1.35]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

const FloorLamp = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.3, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 10, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0, 10.1, 0]}>
        <cylinderGeometry args={[0.35, 0.55, 0.5, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Emissive glow */}
      <mesh position={[0, 9.85, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#7fff9f" transparent opacity={0.85} />
      </mesh>
      {/* Point light */}
      <pointLight
        position={[0, 10, 0]}
        intensity={8}
        color="#88ffaa"
        distance={30}
      />
    </group>
  );
};

const CableSpool = ({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) => {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, rotationY]}>
      {/* Outer flanges */}
      <mesh position={[0, 0, 0.6]}>
        <cylinderGeometry args={[1.1, 1.1, 0.15, 24]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, -0.6]}>
        <cylinderGeometry args={[1.1, 1.1, 0.15, 24]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* Cable wrap */}
      <mesh>
        <cylinderGeometry args={[0.9, 0.9, 1.1, 24]} />
        <meshStandardMaterial color="#0a2a15" metalness={0.3} roughness={0.9} />
      </mesh>
    </group>
  );
};

const Whiteboard = ({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[7.4, 4.4, 0.2]} />
        <meshStandardMaterial color="#4a3a1a" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Board surface */}
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[7, 4]} />
        <meshStandardMaterial color="#f5f5f0" metalness={0.05} roughness={0.9} />
      </mesh>
      {/* Squiggly "handwriting" strokes */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            -3 + Math.random() * 2,
            1.6 - i * 0.55,
            0.12,
          ]}
        >
          <planeGeometry args={[3 + Math.random() * 2, 0.05]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? "#1e5eff" : i % 3 === 1 ? "#111111" : "#c02020"}
          />
        </mesh>
      ))}
      {/* A boxed diagram */}
      <mesh position={[2.2, -0.6, 0.12]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshBasicMaterial color="#f5f5f0" />
      </mesh>
      {[-0.6, 0.6].map((y, i) => (
        <mesh key={`box-h-${i}`} position={[2.2, -0.6 + y, 0.13]}>
          <planeGeometry args={[1.6, 0.04]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
      ))}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={`box-v-${i}`} position={[2.2 + x, -0.6, 0.13]}>
          <planeGeometry args={[0.04, 1.2]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  );
};

const Bookshelf = ({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) => {
  const width = 4;
  const height = 8;
  const depth = 1.2;
  const shelfCount = 4;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#2a1f14" metalness={0.2} roughness={0.85} />
      </mesh>
      {/* Shelves and books */}
      {Array.from({ length: shelfCount }).map((_, shelfIdx) => {
        const shelfY = -height / 2 + 1 + shelfIdx * (height / shelfCount);
        const bookCount = 6 + Math.floor(Math.random() * 4);
        return (
          <group key={shelfIdx} position={[0, shelfY, depth / 2 - 0.3]}>
            {Array.from({ length: bookCount }).map((_, b) => {
              const bookH = 0.9 + Math.random() * 0.6;
              const bookW = width / bookCount - 0.05;
              const colors = ["#8b3a2a", "#2a4a6b", "#4a5a2a", "#6b3a5a", "#2a2a2a", "#8a6a3a"];
              return (
                <mesh
                  key={b}
                  position={[
                    -width / 2 + 0.2 + b * (width / bookCount),
                    bookH / 2 - 0.1,
                    0,
                  ]}
                >
                  <boxGeometry args={[bookW, bookH, 0.5]} />
                  <meshStandardMaterial
                    color={colors[b % colors.length]}
                    roughness={0.9}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

const HazardStripe = ({
  position,
  length,
  rotationY = 0,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
}) => {
  const stripeCount = Math.floor(length / 0.8);
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, rotationY]}>
      {Array.from({ length: stripeCount }).map((_, i) => (
        <mesh
          key={i}
          position={[-length / 2 + 0.4 + i * 0.8, 0, 0]}
          rotation={[0, 0, Math.PI / 4]}
        >
          <planeGeometry args={[0.5, 1.2]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#ffb000" : "#111111"} />
        </mesh>
      ))}
    </group>
  );
};

const HangingMonitor = ({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Mount cable */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 4, 6]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* Bezel */}
      <mesh>
        <boxGeometry args={[3.6, 2.2, 0.2]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[3.3, 1.9]} />
        <meshBasicMaterial color="#031008" />
      </mesh>
      {/* Fake graph line */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            -1.5 + i * 0.27,
            -0.7 + Math.sin(i * 0.7) * 0.5,
            0.12,
          ]}
        >
          <planeGeometry args={[0.05, 0.05]} />
          <meshBasicMaterial color="#00ff41" />
        </mesh>
      ))}
      {/* Header */}
      <mesh position={[0, 0.85, 0.12]}>
        <planeGeometry args={[3.3, 0.15]} />
        <meshBasicMaterial color="#00ff41" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

const CircuitPanel = ({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[4, 4, 0.15]} />
        <meshStandardMaterial color="#0a3a1a" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Traces */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`trace-h-${i}`}
          position={[0, -1.8 + i * 0.5, 0.09]}
        >
          <planeGeometry args={[3.4 - Math.random() * 1.2, 0.05]} />
          <meshBasicMaterial color="#dabb5b" transparent opacity={0.7} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`trace-v-${i}`}
          position={[-1.6 + i * 0.65, 0, 0.09]}
        >
          <planeGeometry args={[0.05, 3.4 - Math.random() * 1.2]} />
          <meshBasicMaterial color="#dabb5b" transparent opacity={0.7} />
        </mesh>
      ))}
      {/* Chips */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`chip-${i}`}
          position={[
            -1.4 + Math.random() * 2.8,
            -1.4 + Math.random() * 2.8,
            0.12,
          ]}
        >
          <boxGeometry args={[0.7, 0.4, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.5} />
        </mesh>
      ))}
      {/* LEDs */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`led-${i}`}
          position={[
            -1.6 + Math.random() * 3.2,
            -1.6 + Math.random() * 3.2,
            0.13,
          ]}
        >
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#ff2a2a" : "#00ff41"} />
        </mesh>
      ))}
    </group>
  );
};

const OuterEnclosure = () => {
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#040808",
        metalness: 0.5,
        roughness: 0.85,
      }),
    [],
  );
  const ceilingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#020404",
        metalness: 0.6,
        roughness: 0.8,
      }),
    [],
  );

  const panelSeams = (width: number, height: number, key: string) =>
    Array.from({ length: Math.floor(width / 8) - 1 }).map((_, i) => (
      <mesh
        key={`${key}-seam-${i}`}
        position={[-width / 2 + 8 + i * 8, 0, 0.05]}
      >
        <planeGeometry args={[0.08, height]} />
        <meshBasicMaterial color="#00ff41" transparent opacity={0.18} />
      </mesh>
    ));

  const bandLights = (width: number, y: number) => (
    <mesh position={[0, y, 0.05]}>
      <planeGeometry args={[width, 0.12]} />
      <meshBasicMaterial color="#00ff41" transparent opacity={0.35} />
    </mesh>
  );

  const roomWidth = 140;
  const roomDepth = 140;
  const roomHeight = 42;
  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;

  const wallThickness = 0.5;

  return (
    <group>
      {/* Back wall — solid slab */}
      <group position={[0, roomHeight / 2, -halfD - wallThickness / 2]}>
        <mesh material={wallMat} receiveShadow>
          <boxGeometry args={[roomWidth, roomHeight, wallThickness]} />
        </mesh>
        <group position={[0, 0, wallThickness / 2]}>
          {panelSeams(roomWidth, roomHeight, "back")}
          {bandLights(roomWidth, -roomHeight / 2 + 2)}
          {bandLights(roomWidth, roomHeight / 2 - 2)}
        </group>
      </group>

      {/* Front wall */}
      <group
        position={[0, roomHeight / 2, halfD + wallThickness / 2]}
        rotation={[0, Math.PI, 0]}
      >
        <mesh material={wallMat} receiveShadow>
          <boxGeometry args={[roomWidth, roomHeight, wallThickness]} />
        </mesh>
        <group position={[0, 0, wallThickness / 2]}>
          {panelSeams(roomWidth, roomHeight, "front")}
          {bandLights(roomWidth, -roomHeight / 2 + 2)}
          {bandLights(roomWidth, roomHeight / 2 - 2)}
        </group>
      </group>

      {/* Left wall */}
      <group
        position={[-halfW - wallThickness / 2, roomHeight / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <mesh material={wallMat} receiveShadow>
          <boxGeometry args={[roomDepth, roomHeight, wallThickness]} />
        </mesh>
        <group position={[0, 0, wallThickness / 2]}>
          {panelSeams(roomDepth, roomHeight, "left")}
          {bandLights(roomDepth, -roomHeight / 2 + 2)}
          {bandLights(roomDepth, roomHeight / 2 - 2)}
        </group>
      </group>

      {/* Right wall */}
      <group
        position={[halfW + wallThickness / 2, roomHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <mesh material={wallMat} receiveShadow>
          <boxGeometry args={[roomDepth, roomHeight, wallThickness]} />
        </mesh>
        <group position={[0, 0, wallThickness / 2]}>
          {panelSeams(roomDepth, roomHeight, "right")}
          {bandLights(roomDepth, -roomHeight / 2 + 2)}
          {bandLights(roomDepth, roomHeight / 2 - 2)}
        </group>
      </group>

      {/* Ceiling — base plane + shader-driven animated grid overlay */}
      <group position={[0, roomHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={ceilingMat}>
          <planeGeometry args={[roomWidth, roomDepth]} />
        </mesh>
        <group position={[0, 0, 0.05]}>
          <AnimatedGridSurface
            width={roomWidth}
            height={roomDepth}
            cellsX={12}
            cellsY={12}
            color="#00ff41"
          />
        </group>
      </group>

      {/* Wall accent scanline panels — big, on outer walls */}
      <group position={[0, roomHeight / 2, -halfD + 0.1]}>
        <AnimatedScanlinePanel width={roomWidth * 0.9} height={roomHeight * 0.9} color="#00ff41" />
      </group>
      <group
        position={[halfW - 0.1, roomHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <AnimatedScanlinePanel width={roomDepth * 0.9} height={roomHeight * 0.9} color="#00ffaa" />
      </group>
      <group
        position={[-halfW + 0.1, roomHeight / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <AnimatedScanlinePanel width={roomDepth * 0.9} height={roomHeight * 0.9} color="#00ff88" />
      </group>

      {/* Floor extension (dark, extends past grid to walls) */}
      <mesh
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial
          color="#030808"
          metalness={0.3}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
};

export default function RoomStructure() {
  return (
    <group>
      {/* Outer enclosure — walls + ceiling + floor extension */}
      <OuterEnclosure />

      {/* Server racks */}
      {RACKS.map((rack, i) => (
        <ServerRack key={`rack-${i}`} rack={rack} />
      ))}

      {/* Corner pillars — extend from floor to ceiling */}
      <CornerPillar position={[-32, 21, -28]} height={42} />
      <CornerPillar position={[32, 21, -28]} height={42} />
      <CornerPillar position={[-32, 21, 15]} height={42} />
      <CornerPillar position={[32, 21, 15]} height={42} />

      {/* Ceiling trusses — top surface tucked against the roof at y=42.
          Main beam is 0.4 tall so center is at y=41.8. */}
      <CeilingTruss position={[0, 41.8, -22]} length={60} />
      <CeilingTruss position={[0, 41.8, -8]} length={60} />
      <CeilingTruss position={[0, 41.8, 6]} length={60} />
      {/* Cross beams along z-axis */}
      <CeilingTruss position={[-20, 41.8, -8]} length={40} rotationY={Math.PI / 2} />
      <CeilingTruss position={[20, 41.8, -8]} length={40} rotationY={Math.PI / 2} />

      {/* Ceiling ducts — 1.2 tall + 1.35 tall rings, center at 41.3 so
          top of rings sits ~1.97 which is under the ceiling. */}
      <CeilingDuct position={[-8, 41.3, -30]} length={30} />
      <CeilingDuct position={[8, 41.3, 20]} length={24} />
      <CeilingDuct
        position={[-40, 41.3, 0]}
        length={40}
        rotationY={Math.PI / 2}
      />
      <CeilingDuct
        position={[40, 41.3, 0]}
        length={40}
        rotationY={Math.PI / 2}
      />

      {/* Holographic dashboard panels — mounted flush on outer walls.
          Left-wall (x=-69.7) panels are placed at z >= 20 so they sit
          behind the "wall" preset camera (pos z=5.33) and don't obstruct
          the GithubWall view. */}
      <HoloPanel
        position={[-69.7, 15, 22]}
        rotationY={Math.PI / 2}
        width={6}
        height={4}
        color="#00ff41"
        title="req/s :: api.amirsalarsafaei.com"
      />
      <HoloPanel
        position={[-69.7, 8, 22]}
        rotationY={Math.PI / 2}
        width={5}
        height={3}
        color="#00ffff"
        title="postgres :: qps"
      />
      <HoloPanel
        position={[-69.7, 15, 32]}
        rotationY={Math.PI / 2}
        width={7}
        height={4.5}
        color="#ffb000"
        title="grpc :: p99 latency"
      />
      <HoloPanel
        position={[69.7, 15, -18]}
        rotationY={-Math.PI / 2}
        width={6}
        height={4}
        color="#00ff88"
        title="k3s :: pod health"
      />
      <HoloPanel
        position={[69.7, 8, 10]}
        rotationY={-Math.PI / 2}
        width={5}
        height={3}
        color="#00ff41"
        title="spotify :: now-playing"
      />
      {/* Extra panels on front wall to fill the +z end of the room */}
      <HoloPanel
        position={[-15, 15, 69.7]}
        rotationY={Math.PI}
        width={6}
        height={4}
        color="#00ff41"
        title="build :: ghcr images"
      />
      <HoloPanel
        position={[15, 15, 69.7]}
        rotationY={Math.PI}
        width={6}
        height={4}
        color="#00ffff"
        title="uptime :: 99.94%"
      />

      {/* Circuit panels — mounted on outer walls */}
      <CircuitPanel position={[-69.8, 10, -30]} rotationY={Math.PI / 2} />
      <CircuitPanel position={[-69.8, 10, 25]} rotationY={Math.PI / 2} />
      <CircuitPanel position={[69.8, 10, -30]} rotationY={-Math.PI / 2} />
      <CircuitPanel position={[69.8, 10, 25]} rotationY={-Math.PI / 2} />
      <CircuitPanel position={[-30, 15, -69.8]} rotationY={0} />
      <CircuitPanel position={[30, 15, -69.8]} rotationY={0} />

      {/* Whiteboards on back wall */}
      <Whiteboard position={[-52, 14, -69.8]} rotationY={0} />
      <Whiteboard position={[52, 14, -69.8]} rotationY={0} />

      {/* Bookshelves against outer walls */}
      <Bookshelf position={[-69.4, 4, -10]} rotationY={Math.PI / 2} />
      <Bookshelf position={[69.4, 4, 5]} rotationY={-Math.PI / 2} />
      <Bookshelf position={[-69.4, 4, 25]} rotationY={Math.PI / 2} />
      <Bookshelf position={[69.4, 4, -25]} rotationY={-Math.PI / 2} />

      {/* Floor lamps at corners */}
      <FloorLamp position={[-38, 0, -35]} />
      <FloorLamp position={[38, 0, -35]} />
      <FloorLamp position={[-38, 0, 35]} />
      <FloorLamp position={[38, 0, 35]} />

      {/* Cable runs on ceiling — 0.2 tall, tucked right under the roof */}
      <CableRun position={[-15, 41.9, -14]} length={28} />
      <CableRun position={[15, 41.9, 0]} length={20} />
      <CableRun
        position={[-28, 41.9, -8]}
        length={20}
        rotationY={Math.PI / 2}
      />
      <CableRun position={[0, 41.9, 15]} length={30} />
      <CableRun
        position={[28, 41.9, -8]}
        length={20}
        rotationY={Math.PI / 2}
      />

      {/* Cable spools on floor */}
      <CableSpool position={[-30, 1, -22]} rotationY={0.3} />
      <CableSpool position={[30, 1, 18]} rotationY={-0.4} />
      <CableSpool position={[-38, 1, 20]} rotationY={0.5} />

      {/* Hanging monitors — hang from ceiling (y=42) by mount cable */}
      <HangingMonitor position={[-18, 38, -25]} rotationY={0.2} />
      <HangingMonitor position={[18, 38, -25]} rotationY={-0.2} />
      <HangingMonitor position={[0, 38, 20]} rotationY={Math.PI} />

      {/* Hazard stripes near rack clusters */}
      <HazardStripe position={[-30, 0.15, 0]} length={20} rotationY={Math.PI / 2} />
      <HazardStripe position={[30, 0.15, 0]} length={20} rotationY={Math.PI / 2} />

      {/* Floor crates — clustered in corners */}
      <FloorCrate position={[-26, 0.8, 15]} size={1.8} rotationY={0.3} />
      <FloorCrate position={[-24, 0.6, 17]} size={1.2} rotationY={-0.2} />
      <FloorCrate position={[-25.5, 2.0, 15.5]} size={1.0} rotationY={0.5} />
      <FloorCrate position={[26, 0.8, -22]} size={1.6} rotationY={-0.4} />
      <FloorCrate position={[24, 0.6, -20]} size={1.2} rotationY={0.2} />
      <FloorCrate position={[-24, 0.8, -22]} size={1.5} rotationY={0.6} />
      <FloorCrate position={[42, 0.8, -32]} size={1.6} rotationY={-0.3} />
      <FloorCrate position={[40, 0.6, -30]} size={1.2} rotationY={0.1} />
      <FloorCrate position={[-42, 0.8, -32]} size={1.6} rotationY={0.4} />
      <FloorCrate position={[42, 0.8, 32]} size={1.8} rotationY={-0.5} />
    </group>
  );
}
