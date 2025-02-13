/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 public/ferris_the_crab.glb -t -T -o src/models/FerrisCrab 
Files: public/ferris_the_crab.glb [1.06MB] > /home/amirsalar/personal/amirsalarsafaei.com/frontend/src/models/ferris_the_crab-transformed.glb [103.15KB] (90%)
Author: tuxlu (https://sketchfab.com/tuxlu)
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/ferris-the-crab-ea4b18d686dd409baa1e0ea6eecb4e07
Title: Ferris the crab
*/

import * as THREE from 'three'
import React from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Object_45: THREE.Mesh
    Object_4: THREE.Mesh
    Object_49: THREE.Mesh
    Object_10: THREE.SkinnedMesh
    Object_12: THREE.SkinnedMesh
    Object_14: THREE.SkinnedMesh
    Object_15: THREE.SkinnedMesh
    Object_17: THREE.SkinnedMesh
    Object_19: THREE.SkinnedMesh
    Object_21: THREE.SkinnedMesh
    GLTF_created_0_rootJoint: THREE.Bone
  }
  materials: {
    ['Material.001']: THREE.MeshStandardMaterial
    flagLGBT: THREE.MeshStandardMaterial
    material_0: THREE.MeshStandardMaterial
    Body: THREE.MeshStandardMaterial
    Material: THREE.MeshStandardMaterial
    Eyes: THREE.MeshStandardMaterial
  }
}

export default function Model(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF('/ferris_the_crab-transformed.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  return (
    <group {...props} dispose={null}>
      <primitive object={nodes.GLTF_created_0_rootJoint} />
      <mesh geometry={nodes.Object_4.geometry} material={materials.flagLGBT} position={[-0.015, 0.04, 0]} rotation={[-2.465, -1.063, 2.113]} scale={[0, 0, 0.003]} />
      <skinnedMesh geometry={nodes.Object_10.geometry} material={materials.Body} skeleton={nodes.Object_10.skeleton} rotation={[0, -0.07, 0]} scale={0.029} />
      <skinnedMesh geometry={nodes.Object_12.geometry} material={materials.Body} skeleton={nodes.Object_12.skeleton} rotation={[0, -0.07, 0]} scale={0.029} />
      <skinnedMesh geometry={nodes.Object_14.geometry} material={materials.Body} skeleton={nodes.Object_14.skeleton} rotation={[0, -0.07, 0]} scale={0.029} />
      <skinnedMesh geometry={nodes.Object_15.geometry} material={materials.Material} skeleton={nodes.Object_15.skeleton} rotation={[0, -0.07, 0]} scale={0.029} />
      <skinnedMesh geometry={nodes.Object_17.geometry} material={materials.Body} skeleton={nodes.Object_17.skeleton} rotation={[0, -0.07, 0]} scale={0.029} />
      <skinnedMesh geometry={nodes.Object_19.geometry} material={materials.Eyes} skeleton={nodes.Object_19.skeleton} rotation={[0, -0.07, 0]} scale={0.029} />
      <skinnedMesh geometry={nodes.Object_21.geometry} material={materials.Body} skeleton={nodes.Object_21.skeleton} rotation={[0, -0.07, 0]} scale={0.029} />
    </group>
  )
}

useGLTF.preload('/ferris_the_crab-transformed.glb')
