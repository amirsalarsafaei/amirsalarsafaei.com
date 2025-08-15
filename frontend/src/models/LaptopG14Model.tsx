import * as THREE from 'three'
import React from 'react'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Object_2: THREE.Mesh
    Object_3: THREE.Mesh
    Object_5: THREE.Mesh
    Object_6: THREE.Mesh
    Object_7: THREE.Mesh
  }
  materials: {
    ['Body_BAKED.002']: THREE.MeshStandardMaterial
    ['Internals_BAKED.002']: THREE.MeshStandardMaterial
    ['Keys_BAKED.002']: THREE.MeshStandardMaterial
    ['Material.001']: THREE.MeshStandardMaterial
    ['Top_Lid.002_BAKED.002']: THREE.MeshStandardMaterial
  }
}

export default function Model(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/laptop-g14-transformed.glb') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Object_2.geometry} material={materials['Body_BAKED.002']} rotation={[-1.556, 0, 0]} scale={10} />
      <mesh geometry={nodes.Object_3.geometry} material={materials['Internals_BAKED.002']} rotation={[-1.556, 0, 0]} scale={10} />
      <mesh geometry={nodes.Object_5.geometry} material={materials['Keys_BAKED.002']} rotation={[-1.556, 0, 0]} scale={10} />
      <mesh geometry={nodes.Object_6.geometry} material={materials['Material.001']} rotation={[-1.556, 0, 0]} scale={10} />
      <mesh geometry={nodes.Object_7.geometry} material={materials['Top_Lid.002_BAKED.002']} rotation={[-1.556, 0, 0]} scale={10} />
    </group>
  )
}

useGLTF.preload('/laptop-g14-transformed.glb')
