'use client';
import { Blog } from '@generated/blogs/blogs';

import styles from './BlogsList.module.scss';
import Link from 'next/link';
import Image from 'next/image';

interface BlogsProps {
	blogs: Blog[],
	isAdmin: boolean,
	isLoadingError: boolean,
	isFetching: boolean,
}

export default function({ blogs, isFetching, isLoadingError, isAdmin }: BlogsProps) {

	return (
		<div className={styles.blogsContainer}>
			{isLoadingError ? (
				<div className={styles.blogsError}>
					<h2>Error loading blogs</h2>
					<p>Please try again later</p>
				</div>
			) : (
				<>
					<div className={styles.blogsGrid}>
						{blogs.map((blog) => (
							<Link href={`${isAdmin ? "/admin" : ""}/blogs/${blog.id}`} key={blog.id}>
								<div className={styles.blogCard}>
									{blog.imageUrl && (
										<div className={styles.blogImage}>
											<div className={styles.imageOverlay}>
												<span className={styles.codeLine}>{"</"}</span>
												<span className={styles.codeTag}>blog</span>
												<span className={styles.codeLine}>{">"}</span>
											</div>
											<Image
												src={blog.imageUrl}
												alt={blog.title}
												width={600}
												height={340}
												className={styles.blogCardImage}
												loading="lazy"
												quality={80}
												sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
												placeholder="blur"
												blurDataURL={`data:image/svg+xml;base64,${Buffer.from(
													'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#2A2A2A"/></svg>'
												).toString('base64')}`}
											/>
										</div>
									)}
									<div className={styles.blogContent}>
										<h3 className={styles.blogTitle}>{blog.title}</h3>
										<div className={styles.blogMeta}>
											<span className={styles.blogDate}>{blog.createdAt?.toLocaleDateString()}</span>
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
					{isFetching && (
						<div className={styles.blogsLoading}>
							<span className="loading-spinner"></span>
							<p>Loading more blogs...</p>
						</div>
					)}
				</>
			)}
		</div>
	);
}
