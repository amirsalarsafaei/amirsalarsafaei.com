import { Html } from "@react-three/drei";


import './screen.scss';
import Tmux from "./Terminal/Tmux";
import { useState } from "react";

export default function Screen() {
	const [focused, setFocused] = useState<boolean>(true);

	return <Html
		onPointerEnter={(e) => { e.stopPropagation(); setFocused(true); }}
		onPointerOut={(e) => { e.stopPropagation(); setFocused(false); }}
		scale={0.5}
		rotation={[-0.36, 0, 0]}
		position={[0, 6.48, -6.85]}
		transform
		occlude='blending'
	>
		<div className="screen-block" draggable={false}>
			<div className="wrapper" draggable={false}>
				<Tmux focused={focused} />
			</div>
		</div>
	</Html>
}
