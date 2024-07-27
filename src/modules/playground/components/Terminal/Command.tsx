export interface CommandProps {
	command: string;
	stdout?: string;
	stderr?: string;
	folder: string;
	id: string;
}

export  function Command({ command, stdout, stderr, folder }: CommandProps) {
	return <div>
		<div>{folder} {command}</div>
		{stderr}
		{stdout}
	</div>
}


