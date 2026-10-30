"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Room props are deliberately limited to what the room is about: the homelab
// rack that runs the site, a beige 90s workstation, and a bookcase. Sourced
// from Sketchfab under CC Attribution — see public/models/sourced/CREDITS.md.
const MODELS = {
  bookcases:
    "/models/sourced/WoodenBookcasesWithBooks/WoodenBookcasesWithBooks.glb",
  retroPc: "/models/sourced/90sDesktopPCPSX/90sDesktopPCPSX.glb",
  serverRack: "/models/sourced/NetworkServerRack/NetworkServerRack.glb",
} as const;

type ModelName = keyof typeof MODELS;

type Vector3Tuple = [number, number, number];

// Source models come in metres with arbitrary pivots. The room is not in
// metres, so each prop is scaled to a target height and re-pivoted on its own
// footprint, sitting at y=0.
function FittedModel({
  model,
  height,
  position,
  rotation = [0, 0, 0],
  tint,
}: {
  model: ModelName;
  height: number;
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
  tint?: string;
}) {
  const { scene } = useGLTF(MODELS[model]);

  const object = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    clone.scale.setScalar(height / size.y);

    const fitted = new THREE.Box3().setFromObject(clone);
    const centre = fitted.getCenter(new THREE.Vector3());
    clone.position.set(-centre.x, -fitted.min.y, -centre.z);

    // Materials are shared between clones of the same GLTF; clone them again
    // before tinting so one prop's tint does not repaint every other copy.
    if (tint) {
      clone.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const recolour = (material: THREE.Material) => {
          const next = material.clone();
          if (next instanceof THREE.MeshStandardMaterial) {
            next.color.multiply(new THREE.Color(tint));
          }
          return next;
        };
        child.material = Array.isArray(child.material)
          ? child.material.map(recolour)
          : recolour(child.material);
      });
    }
    return clone;
  }, [scene, height, tint]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={object} />
    </group>
  );
}

// Faint blue wash from the 90s monitor, so the workstation reads as switched
// on rather than as a silhouette in the dark.
function MonitorGlow({ position }: { position: Vector3Tuple }) {
  return (
    <pointLight
      position={position}
      color="#7ec8ff"
      intensity={45}
      distance={26}
      decay={2}
    />
  );
}

export default function RoomProps() {
  return (
    <group>
      {/* The library belongs to the workstation: one case, angled in so it
          catches the wall wash instead of reading as a flat slab. Tinted cool:
          the raw asset is warm photoreal walnut, which fights the room's teal
          palette and pulls the eye away from the laptop. */}
      <FittedModel
        model="bookcases"
        height={12}
        position={[-32, 0, -27]}
        rotation={[0, 0.5, 0]}
        tint="#7d8f89"
      />

      {/* Beige 90s workstation — the same era as the hi-fi on the other side.
          No chair on purpose: it is a floor vignette, and the modern mesh
          office chair read as an anachronism next to the PSX-era PC. */}
      <FittedModel
        model="retroPc"
        height={5.5}
        position={[-24, 0, -18]}
        rotation={[0, 0.8, 0]}
      />
      <MonitorGlow position={[-22, 4, -16]} />

      {/* Homelab wall at the back right — the same rack that runs the site. */}
      <FittedModel
        model="serverRack"
        height={13}
        position={[40, 0, -52]}
        rotation={[0, 0.12, 0]}
        tint="#a2adaa"
      />
      <FittedModel
        model="serverRack"
        height={13}
        position={[49, 0, -51]}
        rotation={[0, -0.08, 0]}
        tint="#a2adaa"
      />
    </group>
  );
}
