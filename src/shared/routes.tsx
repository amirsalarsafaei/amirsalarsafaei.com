import Error from '@/views/error/Error.tsx';
import App from '@/App.tsx'
import Blogs from '@/views/blogs/Blogs.tsx';
import PublishedBlogs from '@/views/blogs/PublishedBlogs.tsx';
import SingleBlog from '@/views/blogs/Blog.tsx';
import Playground from '@/views/playground/Playground';

const routes = [
	{
		element: <App />,
		errorElement: <Error />,
		children: [
			{
				path: "/",
				element: <Playground />,
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
];

export default routes;
