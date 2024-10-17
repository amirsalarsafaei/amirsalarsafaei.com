import { Html } from "@react-three/drei";

import './screen.scss';
import Tmux from "./Terminal/Tmux";

export default function Screen() {


	return <Html rotation={[-0.36, 0, 0]} position={[0, 9.3, -9.8]} transform occlude>
		<div className="screen-block" draggable={false}>
			<div className="wrapper" draggable={false}>
				<Tmux />
			</div>
		</div>
	</Html>
}
