'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Playground component with no SSR
const Playground = dynamic(() => import('./playground/page'), { ssr: false });

export default function HomePage() {
  return <Playground />;
}

