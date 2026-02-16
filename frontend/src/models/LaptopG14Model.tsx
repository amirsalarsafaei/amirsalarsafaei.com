import { Mesh, MeshStandardMaterial } from 'three'
import React from 'react'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Object_2: Mesh
    Object_3: Mesh
    Object_5: Mesh
    Object_6: Mesh
    Object_7: Mesh
  }
  materials: {
    ['Body_BAKED.002']: MeshStandardMaterial
    ['Internals_BAKED.002']: MeshStandardMaterial
    ['Keys_BAKED.002']: MeshStandardMaterial
    ['Material.001']: MeshStandardMaterial
    ['Top_Lid.002_BAKED.002']: MeshStandardMaterial
  }
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/laptop-g14-transformed.glb",
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Object_2.geometry}
        material={materials["Body_BAKED.002"]}
        rotation={[-1.556, 0, 0]}
        scale={10}
      />
      <mesh
        geometry={nodes.Object_3.geometry}
        material={materials["Internals_BAKED.002"]}
        rotation={[-1.556, 0, 0]}
        scale={10}
      />
      <mesh
        geometry={nodes.Object_5.geometry}
        material={materials["Keys_BAKED.002"]}
        rotation={[-1.556, 0, 0]}
        scale={10}
      />
      <mesh
        geometry={nodes.Object_6.geometry}
        material={materials["Material.001"]}
        rotation={[-1.556, 0, 0]}
        scale={10}
      />
      <mesh
        geometry={nodes.Object_7.geometry}
        material={materials["Top_Lid.002_BAKED.002"]}
        rotation={[-1.556, 0, 0]}
        scale={10}
      />
    </group>
  );
}

useGLTF.preload("/laptop-g14-transformed.glb");
