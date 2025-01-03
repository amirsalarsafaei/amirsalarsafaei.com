'use client';
import { useState } from 'react';
import { useGrpc } from '@/providers/GrpcProvider';
import BlogEditor, { SubmitBlogProps } from '../components/BlogEditor';
import { useAuth } from '@/hooks/useAuth';
import { CreateBlogRequest } from '@generated/blogs/blogs';
import { useRouter } from 'next/navigation';
import { grpc } from '@improbable-eng/grpc-web';
import './page.scss';


export default function NewBlog() {
	const { blogs_client } = useGrpc();
	const { token } = useAuth();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const handleCreate = async (submitBlog: SubmitBlogProps) => {
		if (!submitBlog.title.trim()) {
			alert('Please enter a title');
			return;
		}
		setIsLoading(true);

		const req = CreateBlogRequest.create({ title: submitBlog.title, content: submitBlog.content, imageUrl: submitBlog.imageUrl })
		try {
			const resp = await blogs_client.CreateBlog(req, (token ? new grpc.Metadata({ authorization: token }) : undefined));
			router.push(`/admin/blogs/${resp.blog?.id}`);
			setIsLoading(false);
		} catch (err) {
			console.error('Failed to create blog:', err);
			throw err;
		}
	};

	return (<BlogEditor onSubmit={handleCreate} isSubmiting={isLoading} initialImageUrl={undefined} initialTitle="" initialContent="" buttonLabel="Create New Blog" />);
}
