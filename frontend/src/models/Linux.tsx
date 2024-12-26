'use client';

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    ['Tux-printable_0']: THREE.Mesh
    ['Tux-printable_1']: THREE.Mesh
    ['Tux-printable_2']: THREE.Mesh
  }
  materials: {
    black: THREE.MeshStandardMaterial
    white: THREE.MeshStandardMaterial
    orange: THREE.MeshStandardMaterial
  }
}

export default function Model(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/linux-transformed.glb') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh name="Tux-printable_0" geometry={nodes['Tux-printable_0'].geometry} material={materials.black} position={[0.002, -0.027, -0.719]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh name="Tux-printable_1" geometry={nodes['Tux-printable_1'].geometry} material={materials.white} position={[0.002, -0.027, -0.719]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh name="Tux-printable_2" geometry={nodes['Tux-printable_2'].geometry} material={materials.orange} position={[0.002, -0.027, -0.719]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}
