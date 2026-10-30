"use client";

/**
 * Tiny client-only bus between the 3D laptop keys and the in-scene terminal.
 * Keeping it out of React state avoids re-rendering the whole scene on every
 * keypress.
 */
export type LaptopKeyDetail = {
  key: string;
  char?: string;
  shift?: boolean;
  caps?: boolean;
  ctrl?: boolean;
};

type Listener<T> = (detail: T) => void;

const bus =
  typeof window !== "undefined" ? new EventTarget() : null;

export function emitLaptopKey(detail: LaptopKeyDetail) {
  bus?.dispatchEvent(new CustomEvent<LaptopKeyDetail>("key", { detail }));
}

export function onLaptopKey(listener: Listener<LaptopKeyDetail>): () => void {
  if (!bus) return () => {};
  const handler = (event: Event) =>
    listener((event as CustomEvent<LaptopKeyDetail>).detail);
  bus.addEventListener("key", handler);
  return () => bus.removeEventListener("key", handler);
}

export function emitLaptopFocus() {
  bus?.dispatchEvent(new Event("focus"));
}

export function onLaptopFocus(listener: () => void): () => void {
  if (!bus) return () => {};
  bus.addEventListener("focus", listener);
  return () => bus.removeEventListener("focus", listener);
}

/** True when the real terminal <input> owns focus, so native typing is enough. */
export function isLaptopTerminalFocused(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  return !!active && active.hasAttribute("data-laptop-terminal");
}
