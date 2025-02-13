
'use client';

import React, { useState } from 'react';
import { FaCamera, FaDesktop, FaGithub, FaMusic, FaLinux, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { GopherIcon } from './GopherIcon';

interface CameraControlsUIProps {
    onViewChange: (view: string) => void;
}

const CameraControlsUI: React.FC<CameraControlsUIProps> = ({ onViewChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="controls-container">
            <div className={`controls-panel ${isExpanded ? 'expanded' : 'minimized'}`}>
                <button 
                    className="toggle-button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "Minimize Controls" : "Expand Controls"}
                >
                    {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
                </button>
                <div className="controls-instructions">
                    <code>CTRL/SHIFT + Mouse</code> to move around
                    <br />
                    <span>Type on the laptop screen to interact</span>
                    <br />
                    <span className="mobile-note">Touch controls on mobile</span>
                </div>
                <div className="camera-controls">
                    <button
                        onClick={() => onViewChange('screen')}

                        title="View Screen"
                    >
                        <FaDesktop className="screen-icon" />
                    </button>
                    <button
                        onClick={() => onViewChange('gopher')}

                        title="View Gopher"
                    >
                        <GopherIcon className="gopher-icon" />
                    </button>
                    <button
                        onClick={() => onViewChange('music')}

                        title="View Music Player"
                    >
                        <FaMusic className="music-icon" />
                    </button>
                    <button
                        onClick={() => onViewChange('wall')}

                        title="View Github Wall"
                    >
                        <FaGithub className="github-icon" />
                    </button>
                    <button
                        onClick={() => onViewChange('tux')}

                        title="View Tux"
                    >
                        <FaLinux className="tux-icon" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CameraControlsUI;
