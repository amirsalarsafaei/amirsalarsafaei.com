"use client";

import React, { useState } from "react";
import {
  FaDesktop,
  FaGithub,
  FaMusic,
  FaLinux,
  FaChevronUp,
  FaChevronDown,
  FaTerminal,
  FaRegCopy,
  FaCheck,
} from "react-icons/fa";
import copy from "copy-to-clipboard";
import { GopherIcon } from "./GopherIcon";

interface CameraControlsUIProps {
  onViewChange: (view: string) => void;
}

const SSH_COMMAND = "ssh ssh.amirsalarsafaei.com";

const VIEWS: { id: string; label: string; icon: React.ReactNode }[] = [
  {
    id: "screen",
    label: "Screen",
    icon: <FaDesktop className="screen-icon" />,
  },
  {
    id: "gopher",
    label: "Gopher",
    icon: <GopherIcon className="gopher-icon" />,
  },
  { id: "music", label: "Music", icon: <FaMusic className="music-icon" /> },
  { id: "wall", label: "GitHub", icon: <FaGithub className="github-icon" /> },
  { id: "tux", label: "Tux", icon: <FaLinux className="tux-icon" /> },
];

const CameraControlsUI: React.FC<CameraControlsUIProps> = ({
  onViewChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copy(SSH_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="controls-container">
      <div
        className={`controls-panel ${isExpanded ? "expanded" : "minimized"}`}
      >
        <button
          className="toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Minimize controls" : "Expand controls"}
        >
          {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
          <span className="toggle-label">
            {isExpanded ? "controls" : "show controls"}
          </span>
        </button>

        {/* SSH promo — the headline call to action. */}
        <div className="ssh-promo">
          <div className="ssh-promo__head">
            <FaTerminal className="ssh-promo__icon" />
            <span>Prefer a real terminal? The whole site runs over SSH.</span>
          </div>
          <button
            className="ssh-promo__cmd"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <span className="ssh-promo__prompt">$</span>
            <code>{SSH_COMMAND}</code>
            <span className="ssh-promo__copy">
              {copied ? <FaCheck /> : <FaRegCopy />}
            </span>
          </button>
        </div>

        <div className="controls-instructions">
          <span>
            <kbd>CTRL</kbd>/<kbd>SHIFT</kbd> + drag to orbit
          </span>
          <span>Type on the laptop screen to interact</span>
          <span className="mobile-note">Touch &amp; drag on mobile</span>
        </div>

        <div className="camera-controls">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              title={`Focus ${v.label}`}
            >
              {v.icon}
              <span className="cam-label">{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraControlsUI;
