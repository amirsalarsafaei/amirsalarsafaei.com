import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.scss'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Error from './modules/error/Error.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: < App />,
    errorElement: <Error />
  },
  {
    path: "/cv",
    loader: () => {
      window.location.href = '/cv.pdf';
      return null;
    }
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
