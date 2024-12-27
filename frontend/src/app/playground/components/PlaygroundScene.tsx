'use client';


import LaptopModel from '@/models/LaptopModel';
import Linux from '@/models/Linux';
import AnimatedGopherModel from '@/models/AnimatedGopher';

import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState } from 'react';
import Loading from './Loading';

import './PlaygroundScene.scss';
import Screen from './Screen';
import MusicPlayer from './MusicPlayer';
import RoomEnvironment from './RoomEnvironment';

import {
	OrbitControls,
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
					{/* Enhanced lighting setup */}
					<ambientLight intensity={1.2} />
					<pointLight
						position={[-20, 39, 0]}
						intensity={2.5}
						color="#ffffff"
						distance={80}
						decay={2}
					/>
					<pointLight
						position={[20, 39, 0]}
						intensity={2.5}
						color="#ffffff"
						distance={80}
						decay={2}
					/>
					<spotLight
						position={[0, 30, 10]}
						angle={Math.PI / 3}
						penumbra={0.4}
						intensity={3}
						castShadow
						shadow-bias={-0.0001}
					/>
					{/* Enhanced fill light */}
					<hemisphereLight
						intensity={1.5}
						groundColor="#333333"
						color="#ffffff"
					/>
					{/* Additional rim light */}
					<pointLight
						position={[0, 10, -20]}
						intensity={1.5}
						color="#ffffff"
						distance={50}
						decay={2}
					/>
					<RoomEnvironment />


					{/* Enhanced Floor and Shadows */}
					<group position={[0, 0, 0]}>
						<Grid
							position={[0, 0.01, 0]}
							args={[75, 75]}
							cellSize={0.5}
							cellThickness={0.5}
							cellColor="#1e88e5"
							sectionSize={2}
							sectionThickness={1.5}
							sectionColor="#4fc3f7"
							fadeDistance={100}
							fadeStrength={1}
							followCamera={false}
							infiniteGrid={true}
						/>
						<ContactShadows
							position={[0, -0.01, 0]}
							opacity={0.5}
							scale={50}
							blur={2.5}
							far={20}
							resolution={512}
							color="#000000"
						/>
					</group>

					<LaptopModel scale={3.5} />
					<AnimatedGopherModel
						scale={3}
						rotation={[0, 0.5, 0]}
						position={[-12, 7, -10]}
					/>
					<Linux
						scale={0.12}
						position={[12, 0, -10]}
						rotation={[0, -0.5, 0]}
					/>
					<MusicPlayer />
					<Screen />
					<Controls />
				</Suspense>
			</Canvas >

		</>
	);
}
