"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates an optional, failure-prone subtree (WebGL canvases, third-party
 * embeds) so a crash there cannot take the whole route down. Route-level
 * `error.tsx` still covers everything else.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Isolated UI section failed:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
