import Playground from "./modules/playground/Playground.tsx"
import Navbar from "./shared/Navbar/Navbar.tsx"


function App() {

  return (
		<div style={{"height":"100dvh"}}>
			<Navbar />
			<Playground />
		</div>
  )
}

export default App
