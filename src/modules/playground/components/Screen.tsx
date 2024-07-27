import { Html } from "@react-three/drei";
import { useControls } from "leva";

import './screen.scss';
import Tmux from "./Terminal/Tmux";

export default function Screen() {
	const screen = useControls('screen', {
		position: [0, 9.3, -9.8],
		rotation: [-0.36, 0, 0],
		scale: 5,
		height: 495,
		width: 870,
	})



	return <Html rotation={screen.rotation} position={screen.position} transform occlude>
		<div className="screen-block">
			<div className="wrapper">
				<Tmux />
			</div>
		</div>
	</Html>
}
