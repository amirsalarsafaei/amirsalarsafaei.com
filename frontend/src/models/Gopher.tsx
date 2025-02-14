'use client';

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

export type GLTFResult = GLTF & {
  nodes: {
    Object_4: THREE.Mesh
    Object_14: THREE.Mesh
    left_eye: THREE.Mesh
    left_hand: THREE.Mesh
    left_pupil: THREE.Mesh
    nose_tip001: THREE.Mesh
    right_eye: THREE.Mesh
    right_hand001: THREE.Mesh
    right_pupil: THREE.Mesh
    Object_6: THREE.Mesh
    Object_8: THREE.Mesh
    Object_10: THREE.Mesh
    Object_28: THREE.Mesh
    Object_30: THREE.Mesh
    Object_32: THREE.Mesh
  }
  materials: {
    ['Material.009']: THREE.MeshStandardMaterial
    ['Material.012']: THREE.MeshStandardMaterial
    ['Material.010']: THREE.MeshStandardMaterial
    ['Material.011']: THREE.MeshStandardMaterial
  }
}

export default function Model(props: any) {
  const { nodes, materials } = useGLTF('/gopher.glb', true) as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh name="Object_4" geometry={nodes.Object_4.geometry} material={materials['Material.009']} />
      <mesh name="Object_14" geometry={nodes.Object_14.geometry} material={materials['Material.012']} position={[0.213, 0.124, 1.032]} rotation={[-0.001, 0, -0.049]} scale={0.102} />
      <mesh name="left_eye" geometry={nodes.left_eye.geometry} material={materials['Material.012']} position={[-0.211, 0.885, 0.958]} rotation={[-0.295, -0.285, -0.224]} scale={0.381} />
      <mesh name="left_hand" geometry={nodes.left_hand.geometry} material={materials['Material.010']} position={[-1.101, -0.189, 0.574]} rotation={[0.002, 0.086, 0.399]} scale={0.176} />
      <mesh name="left_pupil" geometry={nodes.left_pupil.geometry} material={materials['Material.011']} position={[-0.255, 0.994, 1.355]} rotation={[-0.296, -0.009, -0.05]} scale={0.109} />
      <mesh name="nose_tip001" geometry={nodes.nose_tip001.geometry} material={materials['Material.011']} position={[0.27, 0.558, 1.192]} rotation={[-0.013, -0.006, -0.07]} scale={0.14} />
      <mesh name="right_eye" geometry={nodes.right_eye.geometry} material={materials['Material.012']} position={[0.746, 0.772, 0.793]} rotation={[-0.282, 0.265, -0.036]} scale={0.366} />
      <mesh name="right_hand001" geometry={nodes.right_hand001.geometry} material={materials['Material.010']} position={[1.287, -0.597, 0.383]} rotation={[-0.204, -0.136, 2.012]} scale={0.165} />
      <mesh name="right_pupil" geometry={nodes.right_pupil.geometry} material={materials['Material.011']} position={[0.788, 0.871, 1.176]} rotation={[0.015, -0.07, -0.159]} scale={0.109} />
      <mesh name="Object_6" geometry={nodes.Object_6.geometry} material={materials['Material.010']} position={[0.215, 0.276, 0.959]} scale={0.321} />
      <mesh name="Object_8" geometry={nodes.Object_8.geometry} material={materials['Material.009']} position={[-0.568, 1.504, -0.069]} scale={0.215} />
      <mesh name="Object_10" geometry={nodes.Object_10.geometry} material={materials['Material.009']} position={[0.908, 1.271, -0.095]} scale={0.215} />
      <mesh name="Object_28" geometry={nodes.Object_28.geometry} material={materials['Material.010']} position={[-0.69, -1.936, -0.067]} rotation={[0.309, -0.722, 1.881]} scale={0.176} />
      <mesh name="Object_30" geometry={nodes.Object_30.geometry} material={materials['Material.010']} position={[0.207, -1.988, -0.077]} rotation={[-0.525, -0.486, 0.575]} scale={0.176} />
      <mesh name="Object_32" geometry={nodes.Object_32.geometry} material={materials['Material.010']} position={[-0.226, -1.234, -0.991]} scale={0.192} />
    </group>
  )
}

useGLTF.preload('/gopher.glb')
