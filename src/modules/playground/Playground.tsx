import { Model } from './models/LaptopModel.tsx'
import { Canvas } from '@react-three/fiber'
import { useControls } from 'leva';

import './playground.scss';
import Screen from './components/Screen.tsx';
import { OrbitControls } from '@react-three/drei';

export default function Playground() {

	const lightConfig = useControls('light', {
		intensity: 300,
		position: [0, 30, -5],
	})

	const otherConfig = useControls('other', {
		ambientLightIntensity: 1.8,
	});

	return (
		<>
			<Canvas
				className='playground'
			>
				<ambientLight intensity={otherConfig.ambientLightIntensity} />
				<pointLight intensity={lightConfig.intensity} position={lightConfig.position} />
				<Model scale={5}/>
				<Screen />
				<OrbitControls />
			</Canvas>

		</>
	);
}

