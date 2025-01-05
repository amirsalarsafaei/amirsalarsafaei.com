'use client';

import { Suspense } from 'react';
import { GetBlogResponse } from "@generated/blogs/blogs";
import styles from './BlogContent.module.scss';
import Image from 'next/image';
import Loading from '@/components/Loading/Loading';
import Markdown from '../../../components/Markdown/Markdown';

export default function BlogContent({ initialData }: { initialData: GetBlogResponse }) {

	if (!initialData || !initialData.blog) {
		return (
			<div className={styles.messageContainer}>
				<div className={styles.message}>Blog not found</div>
				<div className={styles.subMessage}>
					The blog post you're looking for doesn't exist or has been removed.
					<br />
					Please check the URL and try again.
				</div>
			</div>
		);
	}

	return (
		<Suspense fallback={<Loading message={`${initialData.blog.title} is loading`} />}>
			<article className={styles.blogContainer}>
				<header className={styles.blogHeader}>
					
					<h1 className={styles.blogTitle}>{initialData.blog.title}</h1>
					<div className={styles.blogMeta}>
						<time dateTime={initialData.blog.publishedAt?.toString()}>
							{initialData.blog.publishedAt?.toLocaleDateString()}
						</time>
					</div>
					{initialData.blog.tags && (
						<div className={styles.tagContainer}>
							{initialData.blog.tags.map((tag, index) => (
								<span key={index} className={styles.tag}>{tag.name}</span>
							))}
						</div>
					)}
				{initialData.blog.imageUrl && (
					<div className={styles.blogImage}>
						<Image
							src={initialData.blog.imageUrl}
							alt={initialData.blog.title}
							width={800}
							height={400}
							priority
							className={styles.image}
							quality={80}
						/>
					</div>
				)}
				</header>
				<Markdown content={initialData?.blog?.content ?? ''} />
			</article>
		</Suspense>
	);
}
