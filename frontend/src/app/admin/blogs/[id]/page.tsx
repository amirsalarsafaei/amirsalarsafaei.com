'use client';
import { useState, useEffect } from 'react';
import { useGrpc } from '@/providers/GrpcProvider';
import BlogEditor from '../components/BlogEditor';
import { useAuth } from '@/hooks/useAuth';
import { Blog, UpdateBlogRequest, GetBlogRequest, PublishBlogRequest } from '@generated/blogs/blogs';
import { useRouter } from 'next/navigation';
import { grpc } from '@improbable-eng/grpc-web';
import styles from './page.module.scss';


export default function EditBlog({ params }: { params: { id: string } }) {
	const { blogs_client } = useGrpc();
	const { token } = useAuth();
	const [content, setContent] = useState('');
	const [title, setTitle] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isFetching, setIsFetching] = useState(true);

	useEffect(() => {
		const fetchBlog = async () => {
			try {
				const blog = await getBlog(params.id);
				if (blog) {
					setTitle(blog.title);
					setContent(blog.content);
				} else {
					setError('Blog not found');
				}
			} catch (err) {
				setError('Failed to load blog');
				console.error(err);
			} finally {
				setIsFetching(false);
			}
		};

		fetchBlog();
	}, [params.id]);

	const getBlog = async (id: string): Promise<Blog | null> => {
		try {
			const req = GetBlogRequest.create({ id });
			const resp = await blogs_client.GetBlog(req, (token ? new grpc.Metadata({ authorization: token }) : undefined));
			return resp.blog || null;
		} catch (err) {
			console.error('Failed to fetch blog:', err);
			throw err;
		}
	}



	const updateBlog = async (title: string, content: string) => {
		const req = UpdateBlogRequest.create({
			id: params.id,
			title,
			content
		});
		try {
			await blogs_client.UpdateBlog(req, (token ? new grpc.Metadata({ authorization: token }) : undefined));
		} catch (err) {
			console.error('Failed to update blog:', err);
			throw err;
		}
	}

	const publishBlog = async (id: string) => {
		const req = PublishBlogRequest.create({
			id
		});

		try {
			await blogs_client.PublishBlog(req, (token ? new grpc.Metadata({ authorization: token }) : undefined));
		} catch (err) {
			console.error('Failed to publish blog:', err);
			throw err;
		}

	};

	const handleUpdate = async () => {
		if (isLoading) {
			return;
		}
		setIsLoading(true);
		try {
			await updateBlog(title, content);
		} catch (err) {
			setError('Failed to update blog');
		} finally {
			setIsLoading(false);
		}
	}

	const handlePublish = async () => {
		if (isLoading) {
			return;
		}
		setIsLoading(true);
		try {
			await publishBlog(params.id);
		} catch (err) {
			setError('Failed to publish blog');
		} finally {
			setIsLoading(false);
		}
	}

	if (isFetching) {
		return <div className={styles.loading}>Loading...</div>;
	}

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	return (
		<div className={styles.newBlogContainer}>
			<div className={styles.newBlogHeader}>
				<input
					type="text"
					placeholder="Enter blog title..."
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className={styles.titleInput}
				/>
				<div className={styles.buttonGroup}>
					<button
						onClick={handleUpdate}
						disabled={isLoading}
						className={styles.updateButton}
					>
						{isLoading ? 'Updating...' : 'Update Blog'}
					</button>
					<button
						onClick={handlePublish}
						disabled={isLoading}
						className={styles.publishButton}
					>
						{isLoading ? 'Publishing...' : 'Publish Blog'}
					</button>
				</div>
			</div>
			<BlogEditor
				initialContent={content}
				onContentChange={setContent}
			/>
		</div>
	);
}
