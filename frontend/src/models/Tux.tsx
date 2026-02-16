"use client";

import { Mesh, MeshStandardMaterial } from 'three'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    ['Tux-printable_0']: Mesh
    ['Tux-printable_1']: Mesh
    ['Tux-printable_2']: Mesh
  }
  materials: {
    black: MeshStandardMaterial
    white: MeshStandardMaterial
    orange: MeshStandardMaterial
  }
}

export default function Model(props: any) {
  const { nodes, materials } = useGLTF(
    "/linux-transformed.glb",
    true,
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        name="Tux-printable_0"
        geometry={nodes["Tux-printable_0"].geometry}
        material={materials.black}
        position={[0.002, -0.027, -0.719]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh
        name="Tux-printable_1"
        geometry={nodes["Tux-printable_1"].geometry}
        material={materials.white}
        position={[0.002, -0.027, -0.719]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh
        name="Tux-printable_2"
        geometry={nodes["Tux-printable_2"].geometry}
        material={materials.orange}
        position={[0.002, -0.027, -0.719]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

useGLTF.preload("/linux-transformed.glb");
