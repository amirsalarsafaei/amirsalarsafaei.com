import { say } from "cowsay";
import Navbar from "../../shared/Navbar/Navbar";
export default function Error() {
	return (
		<>
			<Navbar />
			<div style={{
				height: '100vh',
				width: '100vw',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			}}>
				<div style={{
					whiteSpace: "pre",
					overflow: "hidden"
				}}>
					{say({ text: "Either this page is under\nconstruction by cows \nor cows don't know what \nyou are looking for" })}
				</div>
			</div>
		</>
	);
}
