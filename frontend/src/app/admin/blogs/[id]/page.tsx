'use client';
import { useState, useEffect } from 'react';
import { useGrpc } from '@/providers/GrpcProvider';
import BlogEditor, { SubmitBlogProps } from '../components/BlogEditor';
import { useAuth } from '@/hooks/useAuth';
import { Blog, UpdateBlogRequest, GetBlogRequest, PublishBlogRequest } from '@generated/blogs/blogs';
import { grpc } from '@improbable-eng/grpc-web';
import styles from './page.module.scss';


export default function EditBlog({ params }: { params: { id: string } }) {
	const { blogs_client } = useGrpc();
	const { token } = useAuth();
	const [blog, setBlog] = useState<Blog | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isFetching, setIsFetching] = useState(true);

	useEffect(() => {
		const fetchBlog = async () => {
			try {
				const blog = await getBlog(params.id);
				if (blog) {
					setBlog(blog);
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



	const updateBlog = async (submitBlog: SubmitBlogProps) => {
		if (isLoading) {
			return;
		}
		setIsLoading(true);
		const req = UpdateBlogRequest.create({
			id: params.id,
			title: submitBlog.title,
			content: submitBlog.content,
			imageUrl: submitBlog.imageUrl
		});
		try {
			await blogs_client.UpdateBlog(req, (token ? new grpc.Metadata({ authorization: token }) : undefined));
			setIsLoading(false);
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
	const handlePublish = async () => {
		if (isPublishing) {
			return;
		}
		setIsPublishing(true);
		try {
			await publishBlog(params.id);
		} catch (err) {
			setError('Failed to publish blog');
		} finally {
			setIsPublishing(false);
		}
	}

	if (isFetching) {
		return <div className={styles.loading}>Loading...</div>;
	}

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	return (
		<BlogEditor
			onSubmit={updateBlog}
			buttonLabel="Update Blog"
			initialImageUrl={blog?.imageUrl} initialTitle={blog?.title ?? ""} initialContent={blog?.content ?? ""}
			isSubmiting={isLoading}
			headerButtons={[
				{ label: "Publish", disabled: isPublishing, onClick: handlePublish },
			]}
		/>
	);
}
