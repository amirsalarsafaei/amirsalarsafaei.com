"use client";

import { useKonamiCode } from "@/hooks/useKonamiCode";
import dynamic from "next/dynamic";
import { memo } from 'react'

// Dynamically import the Playground component with no SSR
const PlaygroundComponent = dynamic(() => import("./playground/page"), { 
  ssr: false, 
});
const Playground = memo(PlaygroundComponent);
const ValentineGame = dynamic(() => import('@/components/game/ValentineGame'), {
  ssr: false,
  loading: () => <p>Loading Cupid's Engine...</p>
}); 

export default function HomePage() {
  const showGame = useKonamiCode();

  return  showGame?  (<ValentineGame/>) :
    (<Playground />);
}
