import * as THREE from 'three'
import React from 'react'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Cube001_Material001_0: THREE.Mesh
  }
  materials: {
    PaletteMaterial001: THREE.MeshStandardMaterial
  }
}

export default function Model(props: any) {
  const { nodes, materials } = useGLTF('/divoom-speaker-transformed.glb') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Cube001_Material001_0.geometry} material={materials.PaletteMaterial001} position={[-2.187, 8.522, 10.062]} rotation={[-1.491, -0.004, 3.088]} />
    </group>
  )
}

useGLTF.preload('/divoom-speaker-transformed.glb')
