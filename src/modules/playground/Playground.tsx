import { Model } from './models/LaptopModel.tsx'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react';

import './playground.scss';
import Screen from './components/Screen.tsx';
import Loading from './components/Loading.tsx';
import { OrbitControls } from '@react-three/drei';

export default function Playground() {

	return (
		<>
			<Canvas
				className='playground'
				camera={{position:[0, 10, 10], rotation:[10, 5, 200]}}
			>
				<Suspense fallback={<Loading />}	>
					<ambientLight intensity={1.8} />
					<pointLight intensity={300} position={[0, 30, -5]} />
					<Model scale={5}/>
					<Screen />
					<OrbitControls />
				</Suspense>
			</Canvas >

		</>
	);
}

