'use client';

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    body_laptop_body_laptop_0: THREE.Mesh
    conncector_komponen_0: THREE.Mesh
    hardware_hardware_0: THREE.Mesh
    keyboard_keyboard_0: THREE.Mesh
    monitor_monitor_0: THREE.Mesh
    screen: THREE.Mesh
  }
  materials: {
    body_laptop: THREE.MeshStandardMaterial
    komponen: THREE.MeshStandardMaterial
    hardware: THREE.MeshStandardMaterial
    keyboard: THREE.MeshStandardMaterial
    monitor: THREE.MeshStandardMaterial
    ['Material.001']: THREE.MeshStandardMaterial
  }
}

export default function Model(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/laptop-2-transformed.glb') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh name="body_laptop_body_laptop_0" geometry={nodes.body_laptop_body_laptop_0.geometry} material={materials.body_laptop} position={[0, 0.154, 0]} scale={0.01} />
      <mesh name="conncector_komponen_0" geometry={nodes.conncector_komponen_0.geometry} material={materials.komponen} position={[2.171, 0.247, 0.423]} scale={0.01} />
      <mesh name="hardware_hardware_0" geometry={nodes.hardware_hardware_0.geometry} material={materials.hardware} position={[0, 0.134, 0]} scale={0.01} />
      <mesh name="keyboard_keyboard_0" geometry={nodes.keyboard_keyboard_0.geometry} material={materials.keyboard} position={[-0.492, 0.285, 0.173]} scale={0.01} />
      <mesh name="monitor_monitor_0" geometry={nodes.monitor_monitor_0.geometry} material={materials.monitor} position={[-2.23, 0.306, -1.377]} rotation={[-0.36, 0, 0]} scale={0.01} />
      <mesh name="screen" geometry={nodes.screen.geometry} material={materials['Material.001']} position={[-2.23, 0.306, -1.377]} rotation={[-0.36, 0, 0]} scale={0.01} />
    </group>
  )
}
