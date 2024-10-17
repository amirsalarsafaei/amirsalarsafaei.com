import Playground from "./modules/playground/Playground.tsx"
import Navbar from "./shared/Navbar/Navbar.tsx"


function App() {

  return (
		<div style={{"height":"100vh"}}>
			<Navbar />
			<Playground />
		</div>
  )
}

export default App
