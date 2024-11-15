import  LaptopModel  from './models/LaptopModel.tsx';
import GopherModel from './models/Gopher.tsx'
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState } from 'react';

import './playground.scss';
import Screen from './components/Screen.tsx';
import Loading from './components/Loading.tsx';
import { OrbitControls } from '@react-three/drei';


const mobilePosition = [0, 12, 25];
const mobileTarget = [0, 5, 0];
const desktopPosition = [0, 13, 10];
const desktopTarget = [0, 10, 0];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile); return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const Controls = () => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      controlsRef.current?.target.set(...mobileTarget);
      camera.position.set(mobilePosition[0], mobilePosition[1], mobilePosition[2]);
    } else {
      controlsRef.current?.target.set(...desktopTarget);
      camera.position.set(desktopPosition[0], desktopPosition[1], desktopPosition[2]);
    }
    controlsRef.current?.update();
  }, [camera, isMobile]);

  return (
    <>
      <OrbitControls ref={controlsRef} />
    </>
  );
}


export default function Playground() {
	const isMobile = useIsMobile();

	return (
		<>
			<Canvas
				className='playground'
				camera={{
					position: isMobile ? [mobilePosition[0], mobilePosition[1], mobilePosition[2]] : [desktopPosition[0], desktopPosition[1], desktopPosition[2]],
					rotation: [10, 5, 200]
				}}
			>
				<Suspense fallback={<Loading />}	>
					<ambientLight intensity={1.8} />
					<pointLight intensity={300} position={[0, 30, -5]} />
					<LaptopModel scale={5}/>
          <GopherModel scale={5} rotation={[0, 0.4, 0]} position={[-18, 11, -18]} />
					<Screen />
					<Controls />
				</Suspense>
			</Canvas >

		</>
	);
}

