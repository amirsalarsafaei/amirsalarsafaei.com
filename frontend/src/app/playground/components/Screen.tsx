import { Html } from "@react-three/drei";

import "./screen.scss";
import Tmux from "./Terminal/Tmux";
import { useEffect, useState } from "react";
import { onLaptopFocus } from "./laptopInput";

export default function Screen({ powered = true }: { powered?: boolean }) {
  const [focused, setFocused] = useState<boolean>(true);

  // A click on a 3D key should bring the terminal back into focus so the
  // injected character lands in the prompt.
  useEffect(() => onLaptopFocus(() => setFocused(true)), []);

  return (
    <Html
      scale={0.5}
      rotation={[-0.34, 0, 0]}
      position={[0, 5.72, -7.16]}
      transform
      occlude
      zIndexRange={[10, 0]}
      pointerEvents={powered ? "auto" : "none"}
      onPointerOver={(e) => {
        e.stopPropagation();
        setFocused(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setFocused(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setFocused(true);
      }}
    >
      <div
        className={`screen-block${powered ? "" : " screen-block--off"}`}
        draggable={false}
      >
        <div className="wrapper" draggable={false} aria-hidden={!powered}>
          <Tmux focused={focused && powered} />
        </div>
        <div className="screen-off" aria-hidden />
      </div>
    </Html>
  );
}
