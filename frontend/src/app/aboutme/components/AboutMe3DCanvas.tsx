'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import dynamic from 'next/dynamic';
import styles from '../page.module.scss';

// Dynamic import for the heavy floating profile card component
const FloatingProfileCard = dynamic(() => import('./FloatingProfileCard'), {
	loading: () => null,
	ssr: false,
});

function Loading() {
	return (
		<div className={styles.loading}>
			<span>Loading 3D profile...</span>
		</div>
	);
}

export default function AboutMe3DCanvas() {
	return (
		<div className={styles.canvasContainer}>

			<Suspense fallback={<Loading />}>
				<Canvas
					camera={{
						position: [0, 0, 13],
						fov: 45
					}}
				>
					<ambientLight intensity={0.4} />
					<pointLight position={[10, 10, 10]} intensity={1} />
					<pointLight position={[-10, -10, 10]} intensity={0.5} />
					<directionalLight
						position={[5, 5, 5]}
						intensity={0.8}
						castShadow
					/>

					<FloatingProfileCard />

					<OrbitControls
						enablePan={false}
						enableZoom={true}
						enableRotate={true}
						minDistance={5}
						maxDistance={15}
						minPolarAngle={Math.PI / 4}
						maxPolarAngle={Math.PI / 1.5}
					/>
				</Canvas>
			</Suspense>
		</div >
	);
}

