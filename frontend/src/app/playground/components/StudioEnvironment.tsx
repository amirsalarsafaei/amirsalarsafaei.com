"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Sourced GLB materials are often metallic; without an environment map those
// surfaces reflect nothing and render black. A PMREM generated from three's
// built-in RoomEnvironment gives them something to reflect, offline.
//
// The PMREM lives in a render target, so its pixels are gone if the browser
// recycles the WebGL context (which it commonly does while the tab is in the
// background). three rebuilds the context but not the map's contents, so we
// regenerate it on `webglcontextrestored`; otherwise every metallic surface
// turns black after returning to the tab.
export default function StudioEnvironment({
  intensity = 0.5,
}: {
  intensity?: number;
}) {
  const { gl, scene } = useThree();

  useEffect(() => {
    let target: THREE.WebGLRenderTarget | null = null;

    const build = () => {
      target?.dispose();
      const pmrem = new THREE.PMREMGenerator(gl);
      target = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = target.texture;
      scene.environmentIntensity = intensity;
      pmrem.dispose();
    };

    build();

    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextrestored", build);

    return () => {
      canvas.removeEventListener("webglcontextrestored", build);
      scene.environment = null;
      target?.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}
