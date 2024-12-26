'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Loading from './components/Loading';

// Dynamically import the Playground component to avoid SSR issues with Three.js
const PlaygroundScene = dynamic(
  () => import('./components/PlaygroundScene'),
  { ssr: false, loading: () => <Loading /> }
);

export default function ClientPlayground() {
  return (
    <Suspense fallback={<Loading />}>
      <PlaygroundScene />
    </Suspense>
  );
}
