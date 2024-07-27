import { Html } from "@react-three/drei";
import { useControls } from "leva";

import './screen.scss';

export default function Screen() {
	const screen = useControls('screen', {
		position: [0, 9.65, -9.9],
		rotation: [-0.36, 0, 0],
		scale: 5,
		height: 495,
		width: 870,
	})

	return <Html rotation={screen.rotation} position={screen.position} transform occlude>
		<div className="screen-block">
			<div className="wrapper">
			<h1>Amirsalar</h1>
			</div>
		</div>
	</Html>
}
