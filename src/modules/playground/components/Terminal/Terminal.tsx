import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { TerminalController } from './TerminalController.ts';
import { Command } from './Command.tsx';
type TerminalProps = {
	focused: boolean;
}
export function Terminal({ focused }: TerminalProps) {
	const [termainalController, _] = useState<TerminalController>(new TerminalController());
	const [cmdInput, setCmdInput] = useState<string>("");
	const listRef = useRef<HTMLDivElement | null>(null);

	const scrollToBottom = () => {
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	};
	useEffect(() => {
		console.log(focused);
	}, [focused])

	useEffect(() => {
		scrollToBottom()
	}, [termainalController.getCommands()])

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			termainalController.runCommand(cmdInput);
			setCmdInput("");
		}
	}

	return <div className="commands" ref={listRef}>
		{termainalController.getCommands().map((c) => (<Command {...c} key={c.id} />))}
		<input className="cmd-input" value={cmdInput} onChange={(e) => setCmdInput(e.target.value)} onKeyDownCapture={handleKeyDown} />
	</div>
}
