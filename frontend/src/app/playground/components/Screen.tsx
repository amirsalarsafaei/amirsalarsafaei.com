import { Html } from "@react-three/drei";


import './screen.scss';
import Tmux from "./Terminal/Tmux";
import { useState } from "react";

export default function Screen() {
	const [focused, setFocused] = useState<boolean>(true);

	return <Html
		scale={0.5}
		rotation={[-0.34, 0, 0]}
		position={[0, 5.85, -7.3]}
		transform
		occlude='blending'
		pointerEvents="none"
		onPointerOver={(e) => {
			e.stopPropagation(); 
			setFocused(true);
		}}
		onPointerOut={(e) => {
			e.stopPropagation();
			setFocused(false);
		}}
		onClick={(e)=>{
			e.stopPropagation();
			setFocused(true);
		}}
	>
		<div className="screen-block" draggable={false}>
			<div className="wrapper" draggable={false}>
				<Tmux focused={focused} />
			</div>
		</div>
	</Html >
}
