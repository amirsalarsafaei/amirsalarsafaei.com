import { Blog } from '@generated/blogs/blogs';

import './BlogsList.scss';
import Link from 'next/link';

interface BlogsProps {
	blogs: Blog[];
	isLoadingError: boolean,
	isFetching: boolean,
}

export default function({ blogs, isFetching, isLoadingError }: BlogsProps) {

	return (
		<div className="blogs-container">
			{isLoadingError ? (
				<div className="blogs-error">
					<h2>Error loading blogs</h2>
					<p>Please try again later</p>
				</div>
			) : (
				<>
					<div className="blogs-grid">
						{blogs.map((blog) => (
							<Link href={`/blogs/${blog.id}`} key={blog.id}>
								<div className="blog-card">
									<h3 className="blog-title">{blog.title}</h3>
									<div className="blog-meta">
										<span className="blog-date">{blog.createdAt?.toLocaleDateString()}</span>
									</div>
								</div>
							</Link>
						))}
					</div>
					{isFetching && (
						<div className="blogs-loading">
							<span className="loading-spinner"></span>
							<p>Loading more blogs...</p>
						</div>
					)}
				</>
			)}
		</div>
	);
}
