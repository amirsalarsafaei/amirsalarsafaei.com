'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox, Image } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingProfileCardProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export default function FloatingProfileCard({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}: FloatingProfileCardProps) {
  const cardRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (cardRef.current) {
      cardRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      cardRef.current.rotation.y = rotation[1] + Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      
      if (hovered) {
        cardRef.current.scale.lerp(new THREE.Vector3(1.02, 1.02, 1.02), 0.1);
      } else {
        cardRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      if (hovered) {
        material.opacity = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.2;
        glowRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), 0.05);
      } else {
        material.opacity = 0;
        glowRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
      }
    }
  });

  const cardWidth = 6;
  const cardHeight = 8;
  const cardDepth = 0.5;

  return (
    <group 
      ref={cardRef} 
      position={[position[0], position[1], position[2]]}
      rotation={rotation}
    >
      <RoundedBox
        ref={glowRef}
        args={[cardWidth + 0.2, cardHeight + 0.2, cardDepth + 0.2]}
        radius={0.3}
        smoothness={4}
        position={[0, 0, -0.1]}
      >
        <meshStandardMaterial
          color="#43D9AD"
          emissive="#43D9AD"
          emissiveIntensity={0.3}
          transparent={true}
          opacity={0}
          roughness={0.2}
          metalness={0.8}
        />
      </RoundedBox>

      <RoundedBox
        args={[cardWidth, cardHeight, cardDepth-0.1]}
        radius={0.2}
        smoothness={4}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.6}
          roughness={0.3}
          transparent={true}
          opacity={0.92}
          emissive="#0a0a1a"
          emissiveIntensity={hovered ? 0.1 : 0.05}
        />
      </RoundedBox>

      <RoundedBox
        args={[cardWidth + 0.05, cardHeight + 0.05, cardDepth + 0.09]}
        radius={0.22}
        smoothness={4}
        position={[0, 0, -0.00]}
      >
        <meshStandardMaterial
          color="#43D9AD"
          emissive="#43D9AD"
          emissiveIntensity={hovered ? 0.4 : 0.2}
          transparent={true}
          opacity={hovered ? 0.3 : 0.1}
          roughness={0.1}
          metalness={0.9}
        />
      </RoundedBox>

      <Image
        url='/amirsalar-photo.jpg'
        position={[0, 2, cardDepth/2 + 0.11]}
        scale={[1.9, 1.9]}
        radius={0.1}
      />
      <RoundedBox
        args={[2, 2, 0.1]}
        radius={0.1}
        position={[0, 2, cardDepth/2 + 0.05]}
      >
        <meshStandardMaterial
          color="#43D9AD"
          metalness={0.2}
          roughness={0.8}
        />
      </RoundedBox>

      <Text
        position={[0, 0.8, cardDepth/2 + 0.05]}
        fontSize={0.4}
        color="#43D9AD"
        anchorX="center"
        anchorY="middle"
        font="/fonts/JetBrainsMono-Bold.ttf"
      >
        AmirSalar Safaei
      </Text>

      <Text
        position={[0, 0.2, cardDepth/2 + 0.05]}
        fontSize={0.25}
        color="#607B96"
        anchorX="center"
        anchorY="middle"
        font="/fonts/JetBrainsMono-Regular.ttf"
      >
        Software Engineer
      </Text>

      <Text
        position={[0, -0.5, cardDepth/2 + 0.05]}
        fontSize={0.2}
        color="#4eff91"
        anchorX="center"
        anchorY="middle"
        maxWidth={cardWidth - 0.5}
        font="/fonts/JetBrainsMono-Regular.ttf"
      >
        Go • Rust • TypeScript • Python
      </Text>

      <Text
        position={[0, -1.5, cardDepth/2 + 0.05]}
        fontSize={0.18}
        color="#999999"
        anchorX="center"
        anchorY="middle"
        textAlign='center'
        maxWidth={cardWidth - 0.5}
        font="/fonts/JetBrainsMono-Regular.ttf"
      >
        Learning/Building distributed systems
        and high performance applications
      </Text>

      <Text
        position={[0, -2.5, cardDepth/2 + 0.05]}
        fontSize={0.15}
        color="#607B96"
        anchorX="center"
        anchorY="middle"
        font="/fonts/JetBrainsMono-Regular.ttf"
      >
        📍 Tehran, Iran
      </Text>

      {Array.from({ length: 8 }).map((_, i) => (
        <FloatingParticle
          key={i}
          index={i}
          hovered={hovered}
        />
      ))}

      {Array.from({ length: 10 }).map((_, i) => (
        <DecorativeShape
          key={`shape-${i}`}
          index={i}
          hovered={hovered}
        />
      ))}
    </group>
  );
}

function FloatingParticle({ index, hovered }: { 
  index: number; 
  hovered: boolean;
}) {
  const particleRef = useRef<THREE.Mesh>(null);
  
  const radius = hovered ? 2.5 : 3.5;
  const angle = (index / 8) * Math.PI * 2;
  const baseX = Math.cos(angle) * radius;
  const baseZ = Math.sin(angle) * radius;
  
  useFrame((state) => {
    if (particleRef.current) {
      const time = state.clock.elapsedTime + index;
      const speed = hovered ? 1.2 : 0.5;
      const amplitude = hovered ? 0.8 : 0.5;
      
      particleRef.current.position.x = baseX + Math.cos(time * speed) * amplitude;
      particleRef.current.position.y = Math.sin(time * 0.7 + index) * (hovered ? 0.6 : 0.3);
      particleRef.current.position.z = baseZ + Math.sin(time * 0.3) * amplitude;
      
      particleRef.current.rotation.x = time * (hovered ? 1 : 0.5);
      particleRef.current.rotation.y = time * (hovered ? 1.4 : 0.7);
      
      const targetScale = hovered ? 1.5 : 1;
      particleRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <mesh ref={particleRef}>
      <sphereGeometry args={[0.03]} />
      <meshStandardMaterial
        color="#43D9AD"
        emissive="#43D9AD"
        emissiveIntensity={hovered ? 0.4 : 0.2}
        transparent={true}
        opacity={hovered ? 0.9 : 0.7}
      />
    </mesh>
  );
}

function DecorativeShape({ index, hovered }: { 
  index: number; 
  hovered: boolean;
}) {
  const shapeRef = useRef<THREE.Mesh>(null);
  
  const positions = [
    [-4, 3.5, 2],
    [4.2, 3.2, -2],
    [-3.8, -3, 1.5],
    [3.5, -3.5, -1.8]
  ];
  
  const basePosition = positions[index] || [0, 0, 0];
  
  useFrame((state) => {
    if (shapeRef.current) {
      const time = state.clock.elapsedTime + index * 2;
      const speed = hovered ? 0.8 : 0.4;
      const amplitude = hovered ? 0.3 : 0.15;
      
      shapeRef.current.position.x = basePosition[0] + Math.sin(time * speed) * amplitude;
      shapeRef.current.position.y = basePosition[1] + Math.cos(time * speed * 0.7) * amplitude;
      shapeRef.current.position.z = basePosition[2] + Math.sin(time * speed * 0.5) * amplitude;
      
      shapeRef.current.rotation.x = time * (hovered ? 0.6 : 0.3);
      shapeRef.current.rotation.y = time * (hovered ? 0.8 : 0.4);
      shapeRef.current.rotation.z = time * (hovered ? 0.4 : 0.2);
      
      const targetScale = hovered ? 1.2 : 0.8;
      shapeRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    }
  });

  const geometries = [
    <octahedronGeometry args={[0.15]} />,
    <tetrahedronGeometry args={[0.18]} />,
    <icosahedronGeometry args={[0.12]} />,
    <dodecahedronGeometry args={[0.14]} />
  ];

  return (
    <mesh ref={shapeRef}>
      {geometries[index]}
      <meshStandardMaterial
        color="#607B96"
        emissive="#607B96"
        emissiveIntensity={hovered ? 0.3 : 0.1}
        transparent={true}
        opacity={hovered ? 0.8 : 0.4}
        wireframe={true}
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  );
}

