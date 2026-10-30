"use client";

import { useSyncExternalStore } from "react";

const AUTH_KEY = "AUTH";

// A tiny module-level store so every hook instance sees the same token (admin
// pages mount independently), and so localStorage is never touched during SSR.
let currentToken: string | null | undefined;
const listeners = new Set<() => void>();

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): string | null {
  if (currentToken === undefined) {
    currentToken = readStoredToken();
  }
  return currentToken;
}

function getServerSnapshot(): string | null {
  return null;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

const setToken = (next: string | null) => {
  currentToken = next;

  if (typeof window !== "undefined") {
    try {
      if (next) {
        window.localStorage.setItem(AUTH_KEY, next);
      } else {
        window.localStorage.removeItem(AUTH_KEY);
      }
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); the
      // in-memory token still works for this session.
    }
  }

  emitChange();
};

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_KEY) return;

    currentToken = event.newValue;
    emitChange();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const useAuth = () => {
  const token = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return {
    token,
    setToken,
    isAuthenticated: !!token,
  };
};
