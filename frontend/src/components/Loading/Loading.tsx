'use client';

import { useEffect, useState } from 'react';
import './Loading.scss';

interface LoadingProps {
	message: string;
}

const loadingStates = [
	'Establishing gRPC connection...',
	'Buffering protocol messages...',
	'Processing protobuf streams...',
	'Handling bidirectional streams...',
	'Validating message schemas...',
	'Serializing binary data...',
];

export default function Loading({ message }: LoadingProps) {
	const [currentState, setCurrentState] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentState(prev => (prev + 1) % loadingStates.length);
		}, 1500);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="tech-spinner">
			<div className="terminal">
				<div className="terminal-body">
					<div className="spinner-container">
						<div className="binary-spinner"></div>
					</div>
					<div className="main-message">{message}</div>
					<div className="state-message">{loadingStates[currentState]}</div>
				</div>
			</div>
		</div>
	);
}
