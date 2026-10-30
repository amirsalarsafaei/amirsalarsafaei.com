"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import ErrorBoundary from "@/components/ErrorBoundary/ErrorBoundary";
import styles from "./ClientPlayground.module.scss";

// Dynamically import the Playground component to avoid SSR issues with Three.js
const PlaygroundScene = dynamic(() => import("./components/PlaygroundScene"), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden />
      <span>mounting ~/playground …</span>
    </div>
  ),
});

function PlaygroundFallback() {
  return (
    <section className={styles.fallback}>
      <div className={styles.panel}>
        <p className={styles.prompt}>$ ./playground --webgl</p>
        <h1>The 3D room needs WebGL</h1>
        <p>
          This browser or device couldn&apos;t start the renderer. Everything
          else is still available.
        </p>
        <div className={styles.links}>
          <Link href="/aboutme">about me →</Link>
          <Link href="/blogs">blogs →</Link>
          <Link href="/terminal">terminal →</Link>
        </div>
      </div>
    </section>
  );
}

export default function ClientPlayground() {
  return (
    <ErrorBoundary fallback={<PlaygroundFallback />}>
      <PlaygroundScene />
    </ErrorBoundary>
  );
}
