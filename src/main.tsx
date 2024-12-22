import './styles/global.scss';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Error from './views/error/Error.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import Blogs from './views/blogs/Blogs.tsx';
import Navbar from "./shared/Navbar/Navbar.tsx";
import { Outlet } from "react-router-dom";
import PublishedBlogs from './views/blogs/PublishedBlogs.tsx';
import SingleBlog from './views/blogs/Blog.tsx';

const RootLayout = () => {
  return (
    <>
      <div>
        <Navbar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </>
  );
};

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <Error />,
    children: [
      {
        path: "/",
        element: <App />,
      },
      {
        path: "/admin/blogs",
        element: <Blogs />,
      },
      {
        path: "/blogs",
        element: <PublishedBlogs />,
      },
      {
        path: "/blogs/:id",
        element: <SingleBlog />,
      },
      {
        path: "/cv",
        loader: () => {
          window.location.href = '/cv.pdf';
          return null;
        }
      }
    ]
  }
]);


const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
)
