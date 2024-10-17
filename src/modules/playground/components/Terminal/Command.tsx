import { formatTime } from "../../../../utils/time";

export interface CommandProps {
	command: string;
	stdout?: string;
	stderr?: string;
	path: string;
	sentAt: Date;
	id: string;
}

export  function Command({ command, stdout, stderr, path, sentAt }: CommandProps) {
	return <div>
		<div>{formatTime(sentAt)} {path} {command}</div>
		{stderr}
		{stdout}
	</div>
}


