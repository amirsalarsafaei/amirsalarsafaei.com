"use client";

import LaptopG14Model from "@/models/LaptopG14Model";
import Tux from "@/models/Tux";
import AnimatedGopherModel from "@/models/AnimatedGopher";
import FerrisCrab from "@/models/FerrisCrab";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Suspense,
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import * as THREE from "three";

// Room bounds — must match the ROOM_* constants in RoomStructure.tsx.
const ROOM_HALF_W = 70;
const ROOM_HALF_D = 70;
const ROOM_HEIGHT = 42;
const CAM_PAD = 6;
import Loading from "./Loading";

import "./PlaygroundScene.scss";
import Screen from "./Screen";
import MusicPlayer from "./MusicPlayer";
import RoomStructure from "./RoomStructure";
import RoomProps from "./RoomProps";
import StudioEnvironment from "./StudioEnvironment";

import { OrbitControls, Grid, ContactShadows } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import CameraControlsUI from "./CameraControlsUI";

const mobilePosition = [0, 15, 50];
const mobileTarget = [0, 10, 0];
const desktopPosition = [0, 15, 25];
const desktopTarget = [0, 10, 0];
const keyboardPosition: [number, number, number] = [0, 11, 18];
const keyboardTarget: [number, number, number] = [0, 1.2, -1.5];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Browsers stop requestAnimationFrame for hidden tabs, so the first frame
// after the tab comes back carries the whole hidden duration as its delta —
// animations snap and anything doing time integration lurches. three's Clock
// has no built-in clamp, so discard the gap when the page becomes visible
// again. Rendering is also suspended while hidden: there is nothing to show,
// and it saves GPU time (and, on some drivers, a context reset).
function SceneLifecycle() {
  const clock = useThree((state) => state.clock);
  const setFrameloop = useThree((state) => state.setFrameloop);

  useEffect(() => {
    const resume = () => {
      // Keep elapsedTime continuous while making the next getDelta() ~0.
      clock.oldTime = performance.now();
      setFrameloop("always");
    };
    const suspend = () => setFrameloop("never");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") suspend();
      else resume();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    onVisibility();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      setFrameloop("always");
    };
  }, [clock, setFrameloop]);

  return null;
}

// A soft radial wash painted on the back wall. The wall is 140 units away from
// the camera, so with a few point lights it reads as a flat slab; this gives
// the room a lit focal area behind the mascots and a gradient into the dark at
// the edges instead.
function BackdropGlow() {
  const texture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size * 0.55,
      0,
      size / 2,
      size * 0.55,
      size * 0.5,
    );
    // Broad, low-contrast wash: enough to keep the far wall from going black,
    // without reading as a spotlight with no fixture.
    gradient.addColorStop(0, "rgba(52, 116, 98, 0.5)");
    gradient.addColorStop(0.4, "rgba(28, 70, 59, 0.3)");
    gradient.addColorStop(0.75, "rgba(10, 28, 23, 0.1)");
    gradient.addColorStop(1, "rgba(3, 9, 7, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;

  return (
    <mesh position={[0, 18, -69.9]}>
      <planeGeometry args={[134, 42]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  );
}

// The laptop screen is an HTML overlay; this light makes it actually cast a
// soft, slightly breathing glow onto the desk around it. It fades out when the
// laptop is powered off, matching the screen and keyboard backlight.
function ScreenGlow({ powered }: { powered: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const current = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!lightRef.current) return;
    const t = clock.getElapsedTime();
    const target = powered
      ? 7.5 + Math.sin(t * 2.1) * 0.55 + Math.sin(t * 5.7) * 0.18
      : 0;
    current.current = THREE.MathUtils.damp(current.current, target, 6, delta);
    lightRef.current.intensity = current.current;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 6.4, -6.1]}
      color="#61afef"
      intensity={0}
      distance={24}
      decay={2}
    />
  );
}

const Controls = ({ currentView }: { currentView: string }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const isMobile = useIsMobile();

  // Keep camera + target inside the room after every OrbitControls update.
  useFrame(() => {
    if (!controlsRef.current) return;
    camera.position.x = clamp(
      camera.position.x,
      -ROOM_HALF_W + CAM_PAD,
      ROOM_HALF_W - CAM_PAD,
    );
    camera.position.z = clamp(
      camera.position.z,
      -ROOM_HALF_D + CAM_PAD,
      ROOM_HALF_D - CAM_PAD,
    );
    camera.position.y = clamp(camera.position.y, 1, ROOM_HEIGHT - CAM_PAD);

    const target = controlsRef.current.target as THREE.Vector3;
    target.x = clamp(target.x, -ROOM_HALF_W + CAM_PAD, ROOM_HALF_W - CAM_PAD);
    target.z = clamp(target.z, -ROOM_HALF_D + CAM_PAD, ROOM_HALF_D - CAM_PAD);
    target.y = clamp(target.y, 1, ROOM_HEIGHT - CAM_PAD);
  });

  const updateCameraPosition = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      if (controlsRef.current) {
        camera.position.set(position[0], position[1], position[2]);
        controlsRef.current.target.set(target[0], target[1], target[2]);
        controlsRef.current.update();
      }
    },
    [camera],
  );

  useEffect(() => {
    const position = isMobile ? mobilePosition : desktopPosition;
    const target = isMobile ? mobileTarget : desktopTarget;
    updateCameraPosition(
      [position[0], position[1], position[2]],
      [target[0], target[1], target[2]],
    );
  }, [isMobile, updateCameraPosition]);

  useEffect(() => {
    switch (currentView) {
      case "gopher":
        updateCameraPosition([2, 10.81, 14.24], [-2.84, 9.44, 5.96]);
        break;
      case "music":
        // Closer than the room view: the player is the subject here, and the
        // LCD copy only resolves once the camera is inside ~14 units.
        updateCameraPosition([10.8, 5.2, 10.8], [17.0, 3.1, -1.2]);
        break;
      case "tux":
        updateCameraPosition([2.26, 9.68, 8.74], [5.67, 8.97, 1.66]);
        break;
      case "screen":
        updateCameraPosition([0, 12, 10], [0, 10, 0]);
        break;
      case "keyboard":
        updateCameraPosition(keyboardPosition, keyboardTarget);
        break;
      default: {
        const position = isMobile ? mobilePosition : desktopPosition;
        const target = isMobile ? mobileTarget : desktopTarget;

        updateCameraPosition(
          [position[0], position[1], position[2]],
          [target[0], target[1], target[2]],
        );
      }
    }
  }, [currentView, isMobile, updateCameraPosition]);

  return (
    <OrbitControls
      ref={controlsRef}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
      minDistance={5}
      maxDistance={50}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      dampingFactor={0.05}
      rotateSpeed={0.5}
    />
  );
};

export default function Playground() {
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState("default");
  const [laptopPowered, setLaptopPowered] = useState(true);

  return (
    <div className="playground-container">
      <CameraControlsUI onViewChange={setCurrentView} />
      <Canvas
        className="playground"
        gl={{ toneMappingExposure: 0.9 }}
        camera={{
          position: isMobile
            ? [mobilePosition[0], mobilePosition[1], mobilePosition[2]]
            : [desktopPosition[0], desktopPosition[1], desktopPosition[2]],
          rotation: [10, 5, 200],
          fov: 45,
        }}
      >
        <Suspense fallback={null}>
          <SceneLifecycle />
          <fog attach="fog" args={["#08120f", 85, 260]} />
          <ambientLight color={"#d7e6e0"} intensity={0.14} />
          <hemisphereLight args={["#6b8b80", "#1e2b26", 0.26]} />
          <RoomStructure />
          <RoomProps />
          <BackdropGlow />
          <StudioEnvironment intensity={0.38} />

          {/* Key — warm, high front-right */}
          <directionalLight
            position={[16, 28, 20]}
            intensity={1.35}
            color="#fff1dd"
          />
          {/* Fill — soft and cool from the front-left */}
          <directionalLight
            position={[-18, 14, 12]}
            intensity={0.4}
            color="#7fb6d9"
          />
          {/* Rim — teal from behind, separates silhouettes from the room */}
          <directionalLight
            position={[0, 18, -30]}
            intensity={0.6}
            color="#4fd8b0"
          />
          {/* Soft overhead fill so the ceiling and upper walls are not a void */}
          <pointLight
            position={[0, 26, 4]}
            intensity={55}
            distance={90}
            decay={2}
            color="#cfe4dd"
          />
          {/* Low colour accents on either side of the room */}
          <pointLight
            position={[-38, 10, -14]}
            intensity={55}
            distance={90}
            decay={2}
            color="#2bbc8a"
          />
          <pointLight
            position={[38, 10, -18]}
            intensity={45}
            distance={90}
            decay={2}
            color="#4fc3f7"
          />
          {/* Wall wash behind the laptop, so the far wall reads as a wall
              instead of a black void. Point lights sit close to it on purpose:
              with decay=2 their reach falls off long before the wall does. */}
          <pointLight
            position={[-36, 20, -58]}
            intensity={170}
            distance={90}
            decay={2}
            color="#2b8372"
          />
          <pointLight
            position={[36, 20, -58]}
            intensity={170}
            distance={90}
            decay={2}
            color="#2b8372"
          />
          {/* Pool of light over the laptop and mascots */}
          <spotLight
            position={[0, 36, 10]}
            angle={0.7}
            penumbra={1}
            intensity={380}
            distance={120}
            decay={2}
            color="#f3fbf7"
          />

          <group position={[0, 0, 0]}>
            <Grid
              position={[0, 0.1, 0]}
              args={[75, 75]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#0e2933"
              sectionSize={2}
              sectionThickness={1}
              sectionColor="#164452"
              fadeDistance={100}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid={true}
            />
            <ContactShadows
              position={[0, 0.2, 0]}
              opacity={0.5}
              scale={50}
              blur={2.5}
              far={20}
              resolution={512}
              color="#000000"
            />
          </group>

          <LaptopG14Model
            scale={5}
            powered={laptopPowered}
            onPowerToggle={() => setLaptopPowered((on) => !on)}
          />
          <ScreenGlow powered={laptopPowered} />
          <AnimatedGopherModel
            scale={3}
            rotation={[0, 0.5, 0]}
            position={[-12, 7, -10]}
          />
          <Tux scale={0.12} position={[12, 0, -10]} rotation={[0, -0.5, 0]} />
          <MusicPlayer />
          <FerrisCrab
            scale={11}
            position={[-11, 0, 0]}
            rotation={[0, 0.7, 0]}
          />
          <Screen powered={laptopPowered} />
          <Controls currentView={currentView} />
        </Suspense>
      </Canvas>
      <Loading />
    </div>
  );
}
