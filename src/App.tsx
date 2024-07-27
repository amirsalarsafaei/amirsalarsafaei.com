import { Leva } from "leva"
import Playground from "./modules/playground/Playground.tsx"


function App() {

  return (
		<div style={{"height":"100vh"}}>
			<Playground />
			<Leva collapsed />
		</div>
  )
}

export default App
