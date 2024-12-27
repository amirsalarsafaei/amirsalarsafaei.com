import { Html } from "@react-three/drei";


import './screen.scss';
import Tmux from "./Terminal/Tmux";

export default function Screen() {

	return <Html 
		scale={0.5}
		rotation={[-0.36, 0, 0]}
		position={[0, 6.48, -6.85]}
		transform 
		occlude='blending'
	>
		<div className="screen-block" draggable={false}>
			<div className="wrapper" draggable={false}>
				<Tmux />
			</div>
		</div>
	</Html>
}
