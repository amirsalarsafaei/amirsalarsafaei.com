'use client';

import { extend, Object3DNode } from '@react-three/fiber';
import helvetiker from 'three/examples/fonts/helvetiker_regular.typeface.json';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

// Extend JSX.IntrinsicElements
declare module '@react-three/fiber' {
  interface ThreeElements {
    textGeometry: Object3DNode<TextGeometry, typeof TextGeometry>
  }
}

// Register TextGeometry as a custom component
extend({ TextGeometry });


// Load the font
const font = new FontLoader().parse(helvetiker);

export default function RoomEnvironment() {

  return (
    <group>
      {/* Small Floating Particles */}
      <group position={[0, 0, 0]}>
        {Array.from({ length: 100 }).map((_, i) => (
          <mesh
            key={`particle-${i}`}
            position={[
              Math.random() * 60 - 30,
              Math.random() * 20,
              Math.random() * 60 - 30
            ]}
            scale={0.08}
          >
            <sphereGeometry />
            <meshBasicMaterial
              color="#4CAF50"
              transparent
              opacity={0.3}
            />
          </mesh>
        ))}
      </group>

      {/* Floating Code Elements */}
      <group position={[0, 0, 0]}>
        {[
          '</>',
          'func()',
          '{}',
          'Some(good_code)',
          'None',
          'Option<MyCode>',
          '=>',
          'const',
          'let',
          'async',
          'cargo',
          'go mod',
          'mutex',
          'grpc',
          '||',
          '&&',
          '===',
          '<div>',
          'map()',
          'useState',
          '.tsx',
          'npm',
          'git',
          'push()',
          'pop()',
        ].map((text, i) => (
          <group
            key={i}
            position={[
              Math.random() * 60 - 30,
              Math.random() * 20,
              Math.random() * 60 - 30
            ]}
            rotation={[0, Math.random() * Math.PI - Math.PI / 2, 0]}
          >
            <mesh>
              <textGeometry
                args={[
                  text,
                  {
                    font,
                    size: 0.3,
                    depth: 0.03,
                    curveSegments: 12,
                    bevelEnabled: false
                  }
                ]}
              />
              <meshBasicMaterial
                color="#4CAF50"
                opacity={0.5}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
