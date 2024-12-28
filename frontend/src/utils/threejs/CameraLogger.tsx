import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

export default function CameraLogger() {
	const { camera } = useThree();
	return <Html><button onClick={() => { console.log(camera) }} /></Html>
}
