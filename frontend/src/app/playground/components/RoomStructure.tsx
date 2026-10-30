"use client";

// Plain room shell: four walls, a floor and a ceiling. Everything that used to
// dress the room (racks, ducts, panels, signage) lives in the scene as sourced
// assets instead, so there is nothing bespoke to maintain here.

const ROOM_WIDTH = 140;
const ROOM_DEPTH = 140;
const ROOM_HEIGHT = 42;
const WALL_THICKNESS = 0.5;

export default function RoomStructure() {
  const halfW = ROOM_WIDTH / 2;
  const halfD = ROOM_DEPTH / 2;

  return (
    <group>
      {/* Back wall */}
      <mesh
        position={[0, ROOM_HEIGHT / 2, -halfD - WALL_THICKNESS / 2]}
        receiveShadow
      >
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial
          color="#1b2723"
          emissive="#091310"
          emissiveIntensity={0.35}
          metalness={0.05}
          roughness={0.95}
        />
      </mesh>

      {/* Front wall */}
      <mesh
        position={[0, ROOM_HEIGHT / 2, halfD + WALL_THICKNESS / 2]}
        receiveShadow
      >
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial
          color="#1b2723"
          emissive="#091310"
          emissiveIntensity={0.35}
          metalness={0.05}
          roughness={0.95}
        />
      </mesh>

      {/* Left wall */}
      <mesh
        position={[-halfW - WALL_THICKNESS / 2, ROOM_HEIGHT / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial
          color="#1b2723"
          emissive="#091310"
          emissiveIntensity={0.35}
          metalness={0.05}
          roughness={0.95}
        />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[halfW + WALL_THICKNESS / 2, ROOM_HEIGHT / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial
          color="#1b2723"
          emissive="#091310"
          emissiveIntensity={0.35}
          metalness={0.05}
          roughness={0.95}
        />
      </mesh>

      {/* Floor */}
      <mesh
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial
          color="#111a16"
          emissive="#050a08"
          emissiveIntensity={0.35}
          metalness={0.12}
          roughness={0.86}
        />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial
          color="#141e1a"
          emissive="#060b09"
          emissiveIntensity={0.4}
          metalness={0.1}
          roughness={0.95}
        />
      </mesh>
    </group>
  );
}
