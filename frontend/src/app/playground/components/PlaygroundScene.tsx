'use client';

import dynamic from 'next/dynamic';
import { useGLTF } from '@react-three/drei'
import type { GLTFResult } from '@/models/Gopher'

const LaptopModel = dynamic(() => import('@/models/LaptopModel'), { ssr: false });
const Linux = dynamic(() => import('@/models/Linux'), { ssr: false });

import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { Suspense, useRef, useEffect, useState } from 'react';
import { Vector3 } from 'three';

import './PlaygroundScene.scss';
import Screen from './Screen';
import Loading from './Loading';
import MusicPlayer from './MusicPlayer';

import {
	OrbitControls,
	Environment,
	Grid,
	ContactShadows,
} from '@react-three/drei';


const mobilePosition = [0, 15, 50];
const mobileTarget = [0, 10, 0];
const desktopPosition = [0, 15, 25];
const desktopTarget = [0, 10, 0];

const useIsMobile = () => {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile); return () => window.removeEventListener('resize', checkMobile);
	}, []);

	return isMobile;
};

interface AnimatedGopherProps {
	scale?: number;
	rotation?: [number, number, number];
	position?: [number, number, number];
}

const AnimatedGopher = (props: AnimatedGopherProps) => {
	const modelRef = useRef<Group>(null);
	const { nodes, materials } = useGLTF('/gopher.glb') as GLTFResult;

	useFrame((state) => {
		if (modelRef.current) {
			// Hand animation
			const leftHand = modelRef.current.getObjectByName('left_hand') as Mesh;
			if (leftHand) {
				leftHand.rotation.y = 0.09 + Math.sin(state.clock.elapsedTime * 1.5) * 1.5;
			}

			// Eye tracking
			const leftEye = modelRef.current.getObjectByName('left_eye') as Mesh;
			const rightEye = modelRef.current.getObjectByName('right_eye') as Mesh;
			const leftPupil = modelRef.current.getObjectByName('left_pupil') as Mesh;
			const rightPupil = modelRef.current.getObjectByName('right_pupil') as Mesh;

			if (leftEye && rightEye && leftPupil && rightPupil) {
				const isMobile = window.innerWidth <= 768;
				const pointer = state.pointer;
				
				// Get world positions
				const leftEyePosition = new Vector3();
				const rightEyePosition = new Vector3();
				leftEye.getWorldPosition(leftEyePosition);
				rightEye.getWorldPosition(rightEyePosition);

				// Project pointer to world space
				const vector = new Vector3();
				vector.set(pointer.x, pointer.y, 0.5);
				vector.unproject(state.camera);
				const dir = vector.sub(state.camera.position).normalize();
				const distance = -state.camera.position.z / dir.z;
				const lookTarget = state.camera.position.clone().add(dir.multiplyScalar(distance));

				// Apply touch movement for mobile
				if (isMobile) {
					lookTarget.add(new Vector3(
						pointer.x * 20,
						pointer.y * 20,
						0
					));
				}

				// Calculate look directions
				const lookAtLeft = lookTarget.clone().sub(leftEyePosition);
				const lookAtRight = lookTarget.clone().sub(rightEyePosition);

				// Maximum pupil movement
				const maxOffset = 0.15;

				// Left eye
				leftEye.rotation.x = -0.295;
				leftEye.rotation.y = -0.285;

				// Calculate left pupil position with smoother movement
				const leftOffsetX = Math.max(-maxOffset, Math.min(maxOffset, lookAtLeft.x * 0.05));
				const leftOffsetY = Math.max(-maxOffset, Math.min(maxOffset, lookAtLeft.y * 0.05));
				leftPupil.position.x = -0.255 + leftOffsetX;
				leftPupil.position.y = 0.994 + leftOffsetY;
				leftPupil.rotation.x = -0.296;
				leftPupil.rotation.y = -0.009;

				// Right eye
				rightEye.rotation.x = -0.282;
				rightEye.rotation.y = 0.265;

				// Calculate right pupil position with smoother movement
				const rightOffsetX = Math.max(-maxOffset, Math.min(maxOffset, lookAtRight.x * 0.05));
				const rightOffsetY = Math.max(-maxOffset, Math.min(maxOffset, lookAtRight.y * 0.05));
				rightPupil.position.x = 0.788 + rightOffsetX;
				rightPupil.position.y = 0.871 + rightOffsetY;
				rightPupil.rotation.x = 0.015;
				rightPupil.rotation.y = -0.07;
			}
		}
	});

	return (
		<group ref={modelRef} {...props} dispose={null}>
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

const Controls = () => {
	const controlsRef = useRef<any>(null);
	const { camera } = useThree();
	const isMobile = useIsMobile();

	useEffect(() => {
		if (isMobile) {
			controlsRef.current?.target.set(...mobileTarget);
			camera.position.set(mobilePosition[0], mobilePosition[1], mobilePosition[2]);
		} else {
			controlsRef.current?.target.set(...desktopTarget);
			camera.position.set(desktopPosition[0], desktopPosition[1], desktopPosition[2]);
		}
		controlsRef.current?.update();
	}, [camera, isMobile]);

	return (
		<>
			<OrbitControls ref={controlsRef} />
		</>
	);
}


export default function Playground() {
	const isMobile = useIsMobile();

	return (
		<>
			<Canvas
				className='playground'
				camera={{
					position: isMobile ? [mobilePosition[0], mobilePosition[1], mobilePosition[2]] : [desktopPosition[0], desktopPosition[1], desktopPosition[2]],
					rotation: [10, 5, 200],
					fov: 45
				}}
				shadows
			>
				<Suspense fallback={<Loading />}>
					{/* Subtle lighting setup */}
					<ambientLight intensity={0.15} />
					<spotLight
						position={[0, 40, 0]}
						angle={0.5}
						penumbra={1}
						intensity={0.3}
						castShadow
						shadow-bias={-0.0001}
						color="#ffffff"
					
					/>
					<spotLight
						position={[30, 30, 30]}
						angle={0.4}
						penumbra={1}
						intensity={0.1}
						castShadow
						shadow-bias={-0.0001}
						color="#4a9eff"
						
					/>
					<spotLight
						position={[-30, 30, -30]}
						angle={0.4}
						penumbra={1}
						intensity={0.1}
						castShadow
						shadow-bias={-0.0001}
						color="#ff4a4a"
						
					/>

					{/* Environment for subtle reflections */}
					<Environment preset="warehouse" background={false} />

					{/* Enhanced Floor and Shadows */}
					<group position={[0, -0.01, 0]}>
						<Grid
							position={[0, -0.01, 0]}
							args={[75, 75]}
							cellSize={0.5}
							cellThickness={0.5}
							cellColor="#0a2463"
							sectionSize={2}
							sectionThickness={1.5}
							sectionColor="#3e92cc"
							fadeDistance={60}
							fadeStrength={1}
							followCamera={false}
							infiniteGrid={true}
						/>
						<ContactShadows
							opacity={0.5}
							scale={50}
							blur={1}
							far={20}
							resolution={256}
							color="#000000"
						/>
					</group>

					<Suspense fallback={null}>
						<LaptopModel scale={5} />
					</Suspense>
					<Suspense fallback={null}>
						<AnimatedGopher
							scale={5}
							rotation={[0, 0.5, 0]}
							position={[-18, 11, -16]}
						/>
					</Suspense>
					<Suspense fallback={null}>
						<Linux
							scale={0.18}
							position={[+18, 0, -15]}
							rotation={[0, -0.5, 0]}
						/>
					</Suspense>
					<Suspense fallback={null}>
						<MusicPlayer />
					</Suspense>
					<Suspense fallback={null}>
						<Screen />
					</Suspense>
					<Controls />
				</Suspense>
			</Canvas >

		</>
	);
}
