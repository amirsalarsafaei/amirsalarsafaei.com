/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 public/linux.glb -T -k -t -o src/modules/playground/models/Linux.tsx 
Files: public/linux.glb [1.2MB] > /home/amirsalar/personal/amirsalarsafaei.com/src/modules/playground/models/linux-transformed.glb [106.71KB] (91%)
Author: Andy Cuccaro (https://sketchfab.com/andycuccaro)
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/tux-157de95fa4014050a969a8361a83d366
Title: Tux
*/

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

export function Model(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/linux-transformed.glb') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh name="Tux-printable_0" geometry={nodes['Tux-printable_0'].geometry} material={materials.black} position={[0.002, -0.027, -0.719]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh name="Tux-printable_1" geometry={nodes['Tux-printable_1'].geometry} material={materials.white} position={[0.002, -0.027, -0.719]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh name="Tux-printable_2" geometry={nodes['Tux-printable_2'].geometry} material={materials.orange} position={[0.002, -0.027, -0.719]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}

useGLTF.preload('/linux-transformed.glb')
