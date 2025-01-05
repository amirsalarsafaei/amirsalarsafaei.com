'use client';


import LaptopModel from '@/models/LaptopModel';
import Linux from '@/models/Linux';
import AnimatedGopherModel from '@/models/AnimatedGopher';

import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import Loading from './Loading';

import './PlaygroundScene.scss';
import Screen from './Screen';
import MusicPlayer from './MusicPlayer';
import RoomEnvironment from './RoomEnvironment';
import GithubWall from './GithubWall';

import {
	OrbitControls,
	Grid,
	ContactShadows,
} from '@react-three/drei';
import CameraControlsUI from './CameraControlsUI';


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


const Controls = ({ currentView }: { currentView: string }) => {
	const controlsRef = useRef<any>(null);
	const { camera } = useThree();
	const isMobile = useIsMobile();

	// Debug function to print camera info
	const printCameraInfo = useCallback(() => {
		if (controlsRef.current) {
			console.log('Camera Position:', [
				Math.round(camera.position.x * 100) / 100,
				Math.round(camera.position.y * 100) / 100,
				Math.round(camera.position.z * 100) / 100
			]);
			console.log('Camera Target:', [
				Math.round(controlsRef.current.target.x * 100) / 100,
				Math.round(controlsRef.current.target.y * 100) / 100,
				Math.round(controlsRef.current.target.z * 100) / 100
			]);
		}
	}, [camera]);

	const updateCameraPosition = useCallback((position: [number, number, number], target: [number, number, number]) => {
		if (controlsRef.current) {
			// Animate to new position
			camera.position.set(position[0], position[1], position[2]);
			controlsRef.current.target.set(target[0], target[1], target[2]);
			controlsRef.current.update();
		}
	}, [camera]);

	// Handle initial mobile/desktop position
	useEffect(() => {
		const position = isMobile ? mobilePosition : desktopPosition;
		const target = isMobile ? mobileTarget : desktopTarget;
		updateCameraPosition([position[0], position[1], position[2]], [target[0], target[1], target[2]]);
	}, [isMobile, updateCameraPosition]);

	// Handle view changes
	useEffect(() => {
		switch (currentView) {
			case 'gopher':
				updateCameraPosition([2, 10.81, 14.24], [-2.84, 9.44, 5.96]);
				break;
			case 'music':
				updateCameraPosition([1.85, 4.86, 17.7], [9.98, 4.3, 2.01]);
				break;
			case 'wall':
				updateCameraPosition([-39.61, 22.23, 5.33], [-10.3, 22.15, -13.67]);
				break;
			case 'tux':
				updateCameraPosition([2.26, 9.68, 8.74], [5.67, 8.97, 1.66]);
				break;
			case 'screen':
				updateCameraPosition([0, 12, 10], [0, 10, 0]);
				break;
			default:
				// Reset to default view based on mobile/desktop
				const position = isMobile ? mobilePosition : desktopPosition;
				const target = isMobile ? mobileTarget : desktopTarget;

				updateCameraPosition([position[0], position[1], position[2]], [target[0], target[1], target[2]]);
		}
	}, [currentView, isMobile, updateCameraPosition]);

	return (
		<OrbitControls
			ref={controlsRef}
			minPolarAngle={Math.PI / 4}
			maxPolarAngle={Math.PI / 1.5}
			minDistance={5}
			maxDistance={50}
			enablePan={true}
			enableZoom={true}
			enableRotate={true}
			dampingFactor={0.05}
			rotateSpeed={0.5}
		/>
	);
}


export default function Playground() {
	const isMobile = useIsMobile();
	const [currentView, setCurrentView] = useState('default');

	return (
		<div className="playground-container">
			<CameraControlsUI onViewChange={setCurrentView} />
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


					{/* Floor, Grid and Shadows */}
					<group position={[0, 0, 0]}>
						<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
							<planeGeometry args={[100, 100]} />
							<meshStandardMaterial 
								color="#202020" 
								roughness={0.8}
								metalness={0.2}
								opacity={1}
								transparent={false}
								depthWrite={true}
							/>
						</mesh>
						<Grid
							position={[0, 0.1, 0]}
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
							position={[0, 0.2, 0]}
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
					<GithubWall />
					<MusicPlayer />
					<Screen />
					<Controls currentView={currentView} />
				</Suspense>
			</Canvas >
		</div>
	);
}
