import { formatTime } from "../../../../utils/time";

import './command.scss';
export interface CommandProps {
	command: string;
	stdout?: string;
	stderr?: string;
	path: string;
	sentAt: Date;
	id: string;
}

export function Command({ command, stdout, stderr, path, sentAt }: CommandProps) {
	return <div>
		<div className="command"><div className="path">{path}</div><div className="text">{command}</div><div className="time">{formatTime(sentAt)}</div></div>
		{stderr && stderr !== "" && (<div className="stderr cmdout">{stderr}</div>)}
		{stdout && stdout !== "" && (<div className="stdout cmdout">{stdout}</div>)}
	</div >
}


