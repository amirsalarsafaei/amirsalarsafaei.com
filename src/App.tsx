import { Outlet } from "react-router-dom"
import Navbar from "./shared/Navbar/Navbar"


function App() {
  return (

    <>
      <div>
        <Navbar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default App
