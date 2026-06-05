"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

// Dynamically import the Playground component with no SSR
const PlaygroundComponent = dynamic(() => import("./playground/page"), {
  ssr: false,
});
const Playground = memo(PlaygroundComponent);
export default function HomePage() {
  return <Playground />;
}
