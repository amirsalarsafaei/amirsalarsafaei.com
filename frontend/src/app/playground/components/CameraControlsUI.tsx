"use client";

import React, { useState } from "react";
import {
  FaDesktop,
  FaMusic,
  FaLinux,
  FaKeyboard,
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
    id: "keyboard",
    label: "Keys",
    icon: <FaKeyboard className="keyboard-icon" />,
  },
  {
    id: "gopher",
    label: "Gopher",
    icon: <GopherIcon className="gopher-icon" />,
  },
  { id: "music", label: "Music", icon: <FaMusic className="music-icon" /> },
  { id: "tux", label: "Tux", icon: <FaLinux className="tux-icon" /> },
];

const CameraControlsUI: React.FC<CameraControlsUIProps> = ({
  onViewChange,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copy(SSH_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="controls-container">
      <div className="controls-bar">
        <button
          className="controls-ssh"
          onClick={handleCopy}
          title="Copy SSH command"
        >
          <FaTerminal aria-hidden />
          <code>{SSH_COMMAND}</code>
          {copied ? <FaCheck aria-hidden /> : <FaRegCopy aria-hidden />}
        </button>

        <div className="controls-views">
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
