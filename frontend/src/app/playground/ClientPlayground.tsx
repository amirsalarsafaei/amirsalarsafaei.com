'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Playground component to avoid SSR issues with Three.js
const PlaygroundScene = dynamic(
  () => import('./components/PlaygroundScene'),
  { ssr: false }
);

export default function ClientPlayground() {
  return (
    <PlaygroundScene />
  );
}
