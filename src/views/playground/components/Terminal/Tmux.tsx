import { Terminal } from './Terminal';

import './tmux.scss';

export default function Tmux() {

	return <div className="tmux">
		<div className="pane">
			<Terminal focused={true} />
		</div>
	</div>
}
