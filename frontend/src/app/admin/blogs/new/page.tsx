'use client';
import { useState } from 'react';
import { useGrpc } from '@/providers/GrpcProvider';
import BlogEditor, { SubmitBlogProps } from '../components/BlogEditor';
import { useAuth } from '@/hooks/useAuth';
import { CreateBlogRequest, SetBlogTagsRequest } from '@generated/blogs/blogs';
import { useRouter } from 'next/navigation';
import { grpc } from '@improbable-eng/grpc-web';
import './page.scss';


export default function NewBlog() {
	const { blogs_client, tags_client } = useGrpc();
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
			const metadata = (token ? new grpc.Metadata({ authorization: token }) : undefined);
			const resp = await blogs_client.CreateBlog(req, metadata);
			try {
				await tags_client.SetBlogTags(SetBlogTagsRequest.create({blogId: resp.blog?.id, tagNames: submitBlog.tags }))
			} catch(err) {
				console.error("could not set blog tags:", err);
			}
			router.push(`/admin/blogs/${resp.blog?.id}`);
			setIsLoading(false);
		} catch (err) {
			console.error('Failed to create blog:', err);
			throw err;
		}
	};

	return (<BlogEditor onSubmit={handleCreate} isSubmiting={isLoading} initialImageUrl={undefined} initialTags={[]} initialTitle="" initialContent="" buttonLabel="Create New Blog" />);
}
