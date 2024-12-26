'use client';

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    gadget001_low_gadget_0: THREE.Mesh
  }
  materials: {
    gadget: THREE.MeshStandardMaterial
  }
}

export default function Model(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/gadget-music-transformed.glb') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh name="gadget001_low_gadget_0" geometry={nodes.gadget001_low_gadget_0.geometry} material={materials.gadget} rotation={[-1.562, 0, 0]} scale={0.064} />
    </group>
  )
}
