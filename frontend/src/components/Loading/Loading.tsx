"use client";

import { useEffect, useState } from "react";
import "./Loading.scss";

interface LoadingProps {
  message?: string;
}

const loadingStates = [
  "Establishing gRPC connection...",
  "Buffering protocol messages...",
  "Processing protobuf streams...",
  "Handling bidirectional streams...",
  "Validating message schemas...",
  "Serializing binary data...",
];

export default function Loading({ message = "Loading" }: LoadingProps) {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentState((prev) => (prev + 1) % loadingStates.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tech-spinner" role="status" aria-live="polite">
      <div className="terminal">
        <div className="terminal-body">
          <div className="spinner-container" aria-hidden>
            <div className="binary-spinner"></div>
          </div>
          <div className="main-message">{message}</div>
          <div className="state-message">{loadingStates[currentState]}</div>
        </div>
      </div>
    </div>
  );
}
