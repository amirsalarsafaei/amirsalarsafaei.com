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

	const camera = useControls('camera', {
		position: [0, 0, 0],
		near: 0.1,
		far: 500,
	});
	
	const screen = useControls('screen', {
		position: [0, 9.65, -9.9 ],
		rotation: [-0.36, 0, 0],
		scale: 5,
		height: 495,
		width: 870,
	})
	return (
		<>
			<Canvas
				className='playground'
				camera={camera}
			>
				<ambientLight intensity={otherConfig.ambientLightIntensity} />
				<pointLight intensity={lightConfig.intensity} position={lightConfig.position} />
				<Model scale={screen.scale} />
				<OrbitControls />
				<Screen />
			</Canvas>

		</>
	);
}

