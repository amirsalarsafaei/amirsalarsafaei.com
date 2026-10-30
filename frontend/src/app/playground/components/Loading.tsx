"use client";

import { useProgress } from "@react-three/drei";

function getLoadingMessage(progress: number) {
  if (progress < 20) return "init";
  if (progress < 40) return "cache";
  if (progress < 60) return "chunk";
  if (progress < 80) return "build";
  return "ready";
}

// Rendered as a DOM overlay outside <Canvas>, not with drei's <Html>. <Html>
// creates its own React root and unmounts it synchronously in a layout-effect
// cleanup, which React 19 rejects when it happens during a render — e.g. when
// this component is a Suspense fallback that unmounts as the scene resolves.
function Loading() {
  const { active, progress } = useProgress();

  if (!active) return null;

  return (
    <div className="scene-loader">
      <div
        style={{
          width: "min(400px, calc(100vw - 32px))",
          backgroundColor: "#1e1e1e",
          borderRadius: "4px",
          padding: "10px",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            color: "#61dafb",
            marginBottom: "5px",
          }}
        >
          $ sys.init() ~/loading_modules...
        </div>

        <div
          style={{
            backgroundColor: "#2d2d2d",
            borderRadius: "2px",
            padding: "5px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "20px",
            }}
          >
            <span
              style={{
                color: "#4ec9b0",
                marginRight: "8px",
              }}
            >
              {"{"}
            </span>
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  color: "#d7ba7d",
                  width: `${progress}%`,
                  transition: "width 0.3s ease-in-out",
                  whiteSpace: "nowrap",
                }}
              >
                {"==>".repeat(
                  Math.max(1, Math.min(15, Math.floor(progress / 7))),
                )}
              </div>
            </div>
            <span
              style={{
                color: "#4ec9b0",
                marginLeft: "8px",
              }}
            >
              {"}"}
            </span>
          </div>
          <div
            style={{
              color: "#ce9178",
              borderTop: "1px solid #3d3d3d",
              paddingTop: "5px",
              fontSize: "0.9em",
            }}
          >
            // Progress: {Math.floor(progress)}% - $
            {getLoadingMessage(progress)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Loading;
