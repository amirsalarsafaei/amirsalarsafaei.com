import { Terminal } from './Terminal';

import './tmux.scss';

export default function Tmux({ focused }: { focused: boolean }) {
	return <div className="tmux">
		<div className="pane">
			<Terminal focused={focused} />
		</div>
	</div>
}
