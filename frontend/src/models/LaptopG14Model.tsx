"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  useFrame,
  type ThreeElements,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  emitLaptopFocus,
  emitLaptopKey,
  isLaptopTerminalFocused,
} from "@/app/playground/components/laptopInput";

/**
 * The G14 model was split in Blender into a body, an internal shell, a lid,
 * the display, one node per keycap and a separate power button. Every key is
 * centred on its own origin so it can be pushed independently.
 */
const MODEL_URL = "/laptop-g14-interactive.glb";

// Kept in Blender's Z-up coordinates; the outer group lays the model flat.
const MODEL_ROTATION: [number, number, number] = [-1.556, 0, 0];
const KEY_TRAVEL = 0.012;
const POWER_TRAVEL = 0.006;
// Keep a quick click visibly depressed instead of snapping back next frame.
const PRESS_HOLD_MS = 110;

const KEY_NAMES = [
  // Media row
  "M1",
  "M2",
  "M3",
  "M4",
  // Function row
  "Escape",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
  "Delete",
  // Number row
  "Backquote",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
  "Minus",
  "Equal",
  "Backspace",
  // QWERTY row
  "Tab",
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyT",
  "KeyY",
  "KeyU",
  "KeyI",
  "KeyO",
  "KeyP",
  "BracketLeft",
  "BracketRight",
  "Backslash",
  // Home row
  "CapsLock",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyJ",
  "KeyK",
  "KeyL",
  "Semicolon",
  "Quote",
  "Enter",
  // Shift row
  "ShiftLeft",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
  "KeyB",
  "KeyN",
  "KeyM",
  "Comma",
  "Period",
  "Slash",
  "ShiftRight",
  // Bottom row + arrows
  "ControlLeft",
  "Fn",
  "MetaLeft",
  "AltLeft",
  "Space",
  "AltRight",
  "ControlRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "ArrowRight",
] as const;

type KeyName = (typeof KEY_NAMES)[number];

const CODE_TO_KEY: Record<string, KeyName> = {
  Escape: "Escape",
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",
  Delete: "Delete",
  Backquote: "Backquote",
  Digit1: "Digit1",
  Digit2: "Digit2",
  Digit3: "Digit3",
  Digit4: "Digit4",
  Digit5: "Digit5",
  Digit6: "Digit6",
  Digit7: "Digit7",
  Digit8: "Digit8",
  Digit9: "Digit9",
  Digit0: "Digit0",
  Minus: "Minus",
  Equal: "Equal",
  Backspace: "Backspace",
  Tab: "Tab",
  KeyQ: "KeyQ",
  KeyW: "KeyW",
  KeyE: "KeyE",
  KeyR: "KeyR",
  KeyT: "KeyT",
  KeyY: "KeyY",
  KeyU: "KeyU",
  KeyI: "KeyI",
  KeyO: "KeyO",
  KeyP: "KeyP",
  BracketLeft: "BracketLeft",
  BracketRight: "BracketRight",
  Backslash: "Backslash",
  IntlBackslash: "Backslash",
  IntlRo: "Backslash",
  CapsLock: "CapsLock",
  KeyA: "KeyA",
  KeyS: "KeyS",
  KeyD: "KeyD",
  KeyF: "KeyF",
  KeyG: "KeyG",
  KeyH: "KeyH",
  KeyJ: "KeyJ",
  KeyK: "KeyK",
  KeyL: "KeyL",
  Semicolon: "Semicolon",
  Quote: "Quote",
  Enter: "Enter",
  NumpadEnter: "Enter",
  ShiftLeft: "ShiftLeft",
  KeyZ: "KeyZ",
  KeyX: "KeyX",
  KeyC: "KeyC",
  KeyV: "KeyV",
  KeyB: "KeyB",
  KeyN: "KeyN",
  KeyM: "KeyM",
  Comma: "Comma",
  Period: "Period",
  Slash: "Slash",
  ShiftRight: "ShiftRight",
  ControlLeft: "ControlLeft",
  MetaLeft: "MetaLeft",
  AltLeft: "AltLeft",
  Space: "Space",
  AltRight: "AltRight",
  ControlRight: "ControlRight",
  ArrowLeft: "ArrowLeft",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowRight: "ArrowRight",
};

const LETTER_CHARS: Record<string, string> = {
  KeyA: "a",
  KeyB: "b",
  KeyC: "c",
  KeyD: "d",
  KeyE: "e",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyI: "i",
  KeyJ: "j",
  KeyK: "k",
  KeyL: "l",
  KeyM: "m",
  KeyN: "n",
  KeyO: "o",
  KeyP: "p",
  KeyQ: "q",
  KeyR: "r",
  KeyS: "s",
  KeyT: "t",
  KeyU: "u",
  KeyV: "v",
  KeyW: "w",
  KeyX: "x",
  KeyY: "y",
  KeyZ: "z",
};

const BASE_CHARS: Record<string, string> = {
  Backquote: "`",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: "0",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: " ",
};

const SHIFT_CHARS: Record<string, string> = {
  Backquote: "~",
  Digit1: "!",
  Digit2: "@",
  Digit3: "#",
  Digit4: "$",
  Digit5: "%",
  Digit6: "^",
  Digit7: "&",
  Digit8: "*",
  Digit9: "(",
  Digit0: ")",
  Minus: "_",
  Equal: "+",
  BracketLeft: "{",
  BracketRight: "}",
  Backslash: "|",
  Semicolon: ":",
  Quote: '"',
  Comma: "<",
  Period: ">",
  Slash: "?",
  Space: " ",
};

const ACTION_KEYS = new Set<KeyName>([
  "Enter",
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

function charFor(
  name: KeyName,
  shift: boolean,
  caps: boolean,
): string | undefined {
  const letter = LETTER_CHARS[name];
  if (letter) {
    // Shift and Caps Lock cancel each other, as on a real keyboard.
    return shift !== caps ? letter.toUpperCase() : letter;
  }
  if (shift && SHIFT_CHARS[name]) return SHIFT_CHARS[name];
  return BASE_CHARS[name];
}

function shouldSendKey(name: KeyName, char: string | undefined): boolean {
  return char !== undefined || ACTION_KEYS.has(name);
}

type KeyRuntime = {
  name: KeyName;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshLambertMaterial;
  position: [number, number, number];
  baseZ: number;
  wavePhase: number;
  press: number;
  hover: number;
  flash: number;
  held: boolean;
  touched: boolean;
  hovered: boolean;
  sticky: boolean;
  pressedUntil: number;
  mesh: THREE.Mesh | null;
};

type LaptopModelProps = ThreeElements["group"] & {
  powered: boolean;
  onPowerToggle: () => void;
};

type LaptopGLTF = {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.MeshStandardMaterial>;
};

const scratchColor = new THREE.Color();
const white = new THREE.Color(1, 1, 1);

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.07,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.32, "rgba(255,255,255,0.72)");
  gradient.addColorStop(0.68, "rgba(255,255,255,0.20)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// The baked key atlas paints dark legends on near-white keycaps, so feeding it
// straight to `emissiveMap` lights up the whole keycap. To backlight only the
// characters, flood-fill the atlas background inward from its border: any dark
// pixel the fill can reach is background (or a face unwrapped outside the key
// top), and whatever it cannot reach is a legend stroke.
function createLegendMask(map: THREE.Texture | null) {
  const image = map?.image as
    | (CanvasImageSource & { width: number; height: number })
    | undefined;
  if (!image) {
    return null;
  }
  const width = image.width;
  const height = image.height;
  if (!width || !height) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const count = width * height;
  const isInk = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const luma =
      (0.2126 * pixels[i * 4] +
        0.7152 * pixels[i * 4 + 1] +
        0.0722 * pixels[i * 4 + 2]) /
      255;
    isInk[i] = luma < 0.5 ? 1 : 0;
  }

  const reached = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const push = (index: number) => {
    if (isInk[index] && !reached[index]) {
      reached[index] = 1;
      queue[tail++] = index;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  for (let i = 0; i < count; i++) {
    const on = isInk[i] && !reached[i] ? 255 : 0;
    pixels[i * 4] = on;
    pixels[i * 4 + 1] = on;
    pixels[i * 4 + 2] = on;
    pixels[i * 4 + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Match the glTF texture's orientation and wrapping so the mask lines up
  // with the albedo UVs.
  texture.flipY = map?.flipY ?? false;
  texture.wrapS = map?.wrapS ?? THREE.ClampToEdgeWrapping;
  texture.wrapT = map?.wrapT ?? THREE.ClampToEdgeWrapping;
  texture.anisotropy = map?.anisotropy ?? 1;
  texture.needsUpdate = true;
  return texture;
}

export default function Model({
  powered,
  onPowerToggle,
  ...props
}: LaptopModelProps) {
  const { nodes, materials } = useGLTF(
    MODEL_URL,
  ) as unknown as LaptopGLTF;

  const glowTexture = useMemo(createGlowTexture, []);
  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const keyMaterial = materials["Keys_BAKED.002"];
  const legendMask = useMemo(
    () => createLegendMask(keyMaterial?.map ?? null),
    [keyMaterial],
  );

  const keyData = useMemo<KeyRuntime[]>(() => {
    const base = materials["Keys_BAKED.002"];
    if (!base) {
      return [];
    }

    return KEY_NAMES.flatMap((name) => {
      const node = nodes[`Key_${name}`];
      if (!node) {
        return [];
      }
      const geometry = node.geometry as THREE.BufferGeometry;

      // Lambert rather than Standard: the keycaps are a matte near-black
      // plastic, and the room has very strong key/spot lights. A standard
      // material's specular lobe caught them and painted a blotchy highlight
      // across the keyboard; Lambert has no specular at all.
      const material = new THREE.MeshLambertMaterial({
        map: base.map,
        color: new THREE.Color(0.02, 0.045, 0.07),
        emissive: new THREE.Color(0, 0, 0),
        emissiveIntensity: 0,
        toneMapped: false,
      });
      // If mask generation ever fails (e.g. an unreadable texture), fall back
      // to the baked atlas rather than losing the keys entirely.
      material.emissiveMap = legendMask ?? base.map;
      material.needsUpdate = true;

      const [x, y, z] = node.position.toArray() as [number, number, number];

      return [
        {
          name,
          geometry,
          material,
          position: [x, y, z],
          baseZ: z,
          wavePhase:
            ((x + 1.35) / 2.7) * 0.58 + ((y + 0.27) / 1.16) * 0.24,
          press: 0,
          hover: 0,
          flash: 0,
          held: false,
          touched: false,
          hovered: false,
          sticky: false,
          pressedUntil: 0,
          mesh: null,
        },
      ];
    });
  }, [legendMask, materials, nodes]);

  const powerButton = useMemo(() => {
    const node = nodes.PowerButton;
    const base = materials["Body_BAKED.002"];
    if (!node || !base) {
      return null;
    }
    const geometry = node.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    if (!bounds) {
      return null;
    }

    const material = base.clone() as THREE.MeshStandardMaterial;
    material.envMapIntensity = 0;
    material.toneMapped = false;
    material.emissiveMap = base.map;
    material.emissive = new THREE.Color(0, 0, 0);
    material.emissiveIntensity = 0;
    material.needsUpdate = true;

    const glowMaterial = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x000000,
      opacity: 0,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    const [x, y, z] = node.position.toArray() as [number, number, number];

    return {
      geometry,
      material,
      glowMaterial,
      position: [x, y, z] as [number, number, number],
      baseZ: z,
      glowZ: z + bounds.max.z - 0.0004,
      glowWidth: (bounds.max.x - bounds.min.x) * 1.8,
      glowHeight: (bounds.max.y - bounds.min.y) * 1.8,
      press: 0,
      hover: 0,
      flash: 0,
      hovered: false,
      pressed: false,
      pressedUntil: 0,
      mesh: null as THREE.Mesh | null,
    };
  }, [glowTexture, materials, nodes]);

  const powerMesh = useRef<THREE.Mesh>(null);
  const rgbLight = useRef<THREE.PointLight>(null);
  const poweredRef = useRef(powered);
  const onPowerToggleRef = useRef(onPowerToggle);
  const powerPointer = useRef<{ x: number; y: number } | null>(null);
  const stickyShift = useRef(false);
  const stickyCtrl = useRef(false);
  const stickyCaps = useRef(false);

  useEffect(() => {
    poweredRef.current = powered;
    if (powered) {
      for (const key of keyData) {
        key.flash = Math.max(key.flash, 0.18);
      }
      if (powerButton) {
        powerButton.flash = 1;
      }
    } else {
      stickyShift.current = false;
      stickyCtrl.current = false;
      stickyCaps.current = false;
      for (const key of keyData) {
        key.sticky = false;
      }
    }
  }, [keyData, powerButton, powered]);

  useEffect(() => {
    onPowerToggleRef.current = onPowerToggle;
  }, [onPowerToggle]);

  // Physical keyboard: light the matching key on the laptop.
  useEffect(() => {
    if (keyData.length === 0) {
      return;
    }
    const byName = new Map(keyData.map((key) => [key.name, key]));

    const releaseAll = () => {
      for (const key of keyData) {
        key.held = false;
        key.touched = false;
      }
      if (powerButton) {
        powerButton.pressed = false;
        powerButton.press = 0;
      }
      powerPointer.current = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      const name = CODE_TO_KEY[event.code];
      const key = name ? byName.get(name) : undefined;
      if (!key) {
        return;
      }
      key.held = true;
      key.flash = 1;
      key.pressedUntil = performance.now() + PRESS_HOLD_MS;
      if (!poweredRef.current) {
        onPowerToggleRef.current();
        return;
      }
      // While the terminal input has focus the browser types the character
      // natively; injecting it too would double every keystroke.
      if (isLaptopTerminalFocused()) {
        return;
      }
      const shift = event.shiftKey;
      const caps = event.getModifierState("CapsLock");
      const ctrl = event.ctrlKey || event.metaKey;
      const char = charFor(name, shift, caps);
      if (!shouldSendKey(name, char)) {
        return;
      }
      event.preventDefault();
      emitLaptopFocus();
      emitLaptopKey({ key: name, char, shift, caps, ctrl });
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const name = CODE_TO_KEY[event.code];
      const key = name ? byName.get(name) : undefined;
      if (key) {
        key.held = false;
      }
    };

    const onPointerUp = () => {
      for (const key of keyData) {
        key.touched = false;
      }
      if (powerButton) {
        powerButton.pressed = false;
      }
      powerPointer.current = null;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [keyData, powerButton]);

  const setStickyVisuals = (names: KeyName[], on: boolean) => {
    for (const key of keyData) {
      if (names.includes(key.name)) {
        key.sticky = on;
      }
    }
  };

  const consumeSticky = () => {
    if (!stickyShift.current && !stickyCtrl.current) {
      return;
    }
    stickyShift.current = false;
    stickyCtrl.current = false;
    setStickyVisuals(
      ["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"],
      false,
    );
  };

  const handleInputKey = (
    name: KeyName,
    shiftPressed: boolean,
    ctrlPressed: boolean,
  ) => {
    if (name === "ShiftLeft" || name === "ShiftRight") {
      stickyShift.current = !stickyShift.current;
      setStickyVisuals(["ShiftLeft", "ShiftRight"], stickyShift.current);
      return;
    }
    if (name === "CapsLock") {
      stickyCaps.current = !stickyCaps.current;
      setStickyVisuals(["CapsLock"], stickyCaps.current);
      return;
    }
    if (name === "ControlLeft" || name === "ControlRight") {
      stickyCtrl.current = !stickyCtrl.current;
      setStickyVisuals(["ControlLeft", "ControlRight"], stickyCtrl.current);
      return;
    }
    if (
      name === "AltLeft" ||
      name === "AltRight" ||
      name === "MetaLeft" ||
      name === "Fn"
    ) {
      return;
    }

    const shift = shiftPressed || stickyShift.current;
    const ctrl = ctrlPressed || stickyCtrl.current;
    const char = charFor(name, shift, stickyCaps.current);
    if (!shouldSendKey(name, char)) {
      return;
    }

    emitLaptopFocus();
    emitLaptopKey({
      key: name,
      char,
      shift,
      caps: stickyCaps.current,
      ctrl,
    });
    consumeSticky();
  };

  useEffect(() => {
    return () => {
      for (const key of keyData) {
        key.material.dispose();
      }
      if (powerButton) {
        powerButton.material.dispose();
        powerButton.glowMaterial.dispose();
      }
      planeGeometry.dispose();
      glowTexture?.dispose();
      legendMask?.dispose();
      document.body.style.cursor = "";
    };
  }, [glowTexture, keyData, legendMask, planeGeometry, powerButton]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = clock.elapsedTime;
    const isOn = poweredRef.current;
    // One shared cyan/light-blue hue: every key sits in the same palette and
    // drifts slowly between cyan and blue as a whole.
    const hue = 0.54 + Math.sin(time * 0.3) * 0.03;

    for (const key of keyData) {
      const target =
        key.held || key.touched || performance.now() < key.pressedUntil ? 1 : 0;
      key.press = THREE.MathUtils.damp(
        key.press,
        target,
        target > key.press ? 34 : 18,
        dt,
      );
      key.hover = THREE.MathUtils.damp(key.hover, key.hovered ? 1 : 0, 16, dt);
      key.flash = Math.max(0, key.flash - dt * 2.8);

      if (key.mesh) {
        key.mesh.position.z = key.baseZ - key.press * KEY_TRAVEL;
      }

      if (!isOn) {
        key.material.emissive.setRGB(0, 0, 0);
        key.material.emissiveIntensity = 0;
        continue;
      }

      const shimmer =
        0.52 + Math.sin(time * 0.9 + key.wavePhase * 7) * 0.035;
      scratchColor.setHSL(hue, 0.95, shimmer);
      if (key.flash > 0) {
        scratchColor.lerp(white, Math.min(1, key.flash) * 0.8);
      }

      key.material.emissive.copy(scratchColor);
      key.material.emissiveIntensity =
        1.35 +
        key.hover * 0.5 +
        key.press * 1.2 +
        key.flash * 1.6 +
        (key.sticky ? 0.6 : 0);
    }

    if (powerButton) {
      const powerDown =
        powerButton.pressed || performance.now() < powerButton.pressedUntil;
      const target = powerDown || powerButton.hovered ? 1 : 0;
      powerButton.press = THREE.MathUtils.damp(
        powerButton.press,
        powerDown ? 1 : 0,
        powerDown ? 34 : 18,
        dt,
      );
      powerButton.hover = THREE.MathUtils.damp(
        powerButton.hover,
        target,
        16,
        dt,
      );
      powerButton.flash = Math.max(0, powerButton.flash - dt * 3.4);
      if (powerMesh.current) {
        powerMesh.current.position.z =
          powerButton.baseZ - powerButton.press * POWER_TRAVEL;
      }

      if (isOn) {
        scratchColor.setHSL(hue, 0.4, 0.82);
        powerButton.material.emissive.copy(scratchColor);
        powerButton.material.emissiveIntensity =
          0.34 +
          powerButton.hover * 0.22 +
          powerButton.press * 0.35 +
          powerButton.flash * 1.2;
        powerButton.glowMaterial.color.copy(scratchColor);
        powerButton.glowMaterial.opacity =
          0.18 +
          powerButton.hover * 0.16 +
          powerButton.press * 0.2 +
          powerButton.flash * 0.35;
      } else {
        const standby = 0.5 + 0.5 * Math.sin(time * 2.4);
        powerButton.material.emissive.setRGB(1, 0.08, 0.04);
        powerButton.material.emissiveIntensity =
          0.12 + standby * 0.16 + powerButton.flash * 1.1;
        powerButton.glowMaterial.color.setRGB(1, 0.1, 0.05);
        powerButton.glowMaterial.opacity = 0.04 + standby * 0.05;
      }
    }

    if (rgbLight.current) {
      rgbLight.current.color.setHSL(hue, 0.85, 0.5);
      rgbLight.current.intensity = isOn ? 2.2 : 0;
    }
  });

  const pointerCursor = (on: boolean) => {
    document.body.style.cursor = on ? "pointer" : "";
  };

  return (
    <group {...props} dispose={null}>
      <group rotation={MODEL_ROTATION}>
        <mesh
          name="Body"
          geometry={nodes.Body.geometry}
          material={materials["Body_BAKED.002"]}
        />
        <mesh
          name="Internals"
          geometry={nodes.Internals.geometry}
          material={materials["Internals_BAKED.002"]}
        />
        <mesh
          name="Lid"
          geometry={nodes.Lid.geometry}
          material={materials["Top_Lid.002_BAKED.002"]}
        />
        <mesh
          name="ScreenDisplay"
          geometry={nodes.ScreenDisplay.geometry}
          material={materials["Material.001"]}
        />

        {keyData.map((key) => (
          <mesh
            key={key.name}
            ref={(mesh) => {
              key.mesh = mesh;
            }}
            name={`Key_${key.name}`}
            frustumCulled={false}
            geometry={key.geometry}
            material={key.material}
            position={key.position}
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              key.touched = true;
              key.flash = 1;
              key.pressedUntil = performance.now() + PRESS_HOLD_MS;
              pointerCursor(true);
              if (!poweredRef.current) {
                onPowerToggleRef.current();
                return;
              }
              handleInputKey(
                key.name,
                event.nativeEvent.shiftKey,
                event.nativeEvent.ctrlKey || event.nativeEvent.metaKey,
              );
            }}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              key.touched = false;
            }}
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              key.hovered = true;
              pointerCursor(true);
            }}
            onPointerOut={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              key.hovered = false;
              key.touched = false;
              pointerCursor(false);
            }}
          />
        ))}

        {powerButton && (
          <>
            <mesh
              ref={powerMesh}
              name="PowerButton"
              frustumCulled={false}
              geometry={powerButton.geometry}
              material={powerButton.material}
              position={powerButton.position}
              onPointerDown={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                powerButton.pressed = true;
                powerButton.flash = 1;
                powerButton.pressedUntil = performance.now() + PRESS_HOLD_MS;
                powerPointer.current = {
                  x: event.nativeEvent.clientX,
                  y: event.nativeEvent.clientY,
                };
                pointerCursor(true);
              }}
              onPointerUp={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                powerButton.pressed = false;
                const start = powerPointer.current;
                powerPointer.current = null;
                if (!start) {
                  return;
                }
                const distance = Math.hypot(
                  event.nativeEvent.clientX - start.x,
                  event.nativeEvent.clientY - start.y,
                );
                if (distance < 6) {
                  onPowerToggleRef.current();
                }
              }}
              onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                powerButton.hovered = true;
                pointerCursor(true);
              }}
              onPointerOut={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                powerButton.hovered = false;
                powerButton.pressed = false;
                pointerCursor(false);
              }}
            />
            <mesh
              geometry={planeGeometry}
              position={[
                powerButton.position[0],
                powerButton.position[1],
                powerButton.glowZ,
              ]}
              scale={[powerButton.glowWidth, powerButton.glowHeight, 1]}
              material={powerButton.glowMaterial}
              raycast={() => {}}
            />
          </>
        )}

        <pointLight
          ref={rgbLight}
          position={[0, 0.32, 0.5]}
          color="#ffffff"
          intensity={0}
          distance={7}
          decay={2}
        />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
