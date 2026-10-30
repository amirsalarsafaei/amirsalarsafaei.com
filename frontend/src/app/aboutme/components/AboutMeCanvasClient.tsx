"use client";

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ErrorBoundary/ErrorBoundary";
import styles from "./AboutMeCanvasClient.module.scss";

// Three.js must not run during SSR.
const ThreeDCanvas = dynamic(() => import("./AboutMe3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden />
      <span>initializing 3D profile…</span>
    </div>
  ),
});

export default function AboutMeCanvasClient() {
  return (
    <ErrorBoundary
      fallback={
        <div className={styles.fallback} role="status">
          <span className={styles.prompt}>$ glxinfo | grep &quot;OpenGL&quot;</span>
          <h2>3D view unavailable</h2>
          <p>
            This browser or device didn&apos;t provide WebGL. The rest of the
            page still works.
          </p>
        </div>
      }
    >
      <ThreeDCanvas />
    </ErrorBoundary>
  );
}
