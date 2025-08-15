'use client';


import LaptopG14Model from '@/models/LaptopG14Model';
import DivoomSpeakerModel from '@/models/DivoomSpeakerModel';
import Tux from '@/models/Tux';
import AnimatedGopherModel from '@/models/AnimatedGopher';
import FerrisCrab from '@/models/FerrisCrab';

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

	const updateCameraPosition = useCallback((position: [number, number, number], target: [number, number, number]) => {
		if (controlsRef.current) {
			camera.position.set(position[0], position[1], position[2]);
			controlsRef.current.target.set(target[0], target[1], target[2]);
			controlsRef.current.update();
		}
	}, [camera]);

	useEffect(() => {
		const position = isMobile ? mobilePosition : desktopPosition;
		const target = isMobile ? mobileTarget : desktopTarget;
		updateCameraPosition([position[0], position[1], position[2]], [target[0], target[1], target[2]]);
	}, [isMobile, updateCameraPosition]);

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
			>
				<Suspense fallback={<Loading />}>
								<ambientLight color={"#ffffff"} intensity={0.4} />
					<RoomEnvironment />
								
								<pointLight position={[-15, 12, 15]} intensity={20} color="#f0f8ff" distance={200} />
								<pointLight position={[15, 12, 15]} intensity={20} color="#f0f8ff" distance={200} />
								
								<pointLight position={[-15, 12, -15]} intensity={20} color="#fff5ee" distance={200} />
								<pointLight position={[15, 12, -15]} intensity={20} color="#fff5ee" distance={200} />
								
								<pointLight position={[-25, 8, 0]} intensity={20} color="#f5f5dc" distance={200} />
								<pointLight position={[25, 8, 0]} intensity={20} color="#f5f5dc" distance={200} />
								
								<pointLight position={[0, 20, 10]} intensity={20} color="#ffffff" distance={200} />
								<pointLight position={[0, 20, -10]} intensity={20} color="#ffffff" distance={200} />
								
								<directionalLight 
									position={[10, 25, 10]} 
									intensity={1.5} 
									color="#ffffff"
									castShadow={false}
								/>

					<group position={[0, 0, 0]}>
						
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

					<LaptopG14Model scale={5} />
					<AnimatedGopherModel
						scale={3}
						rotation={[0, 0.5, 0]}
						position={[-12, 7, -10]}
					/>
					<Tux
						scale={0.12}
						position={[12, 0, -10]}
						rotation={[0, -0.5, 0]}
					/>
					<MusicPlayer />
					<FerrisCrab 
						scale={11}
						position={[-11, 0, 0]}
						rotation={[0, 0.7, 0]}
					/>
					<Screen />
					<GithubWall />
					<Controls currentView={currentView} />
				</Suspense>
			</Canvas >
		</div>
	);
}
