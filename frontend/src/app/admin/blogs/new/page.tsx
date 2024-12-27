'use client';
import { useState } from 'react';
import { useGrpc } from '@/providers/GrpcProvider';
import BlogEditor from '../components/BlogEditor';
import { useAuth } from '@/hooks/useAuth';
import { CreateBlogRequest } from '@generated/blogs/blogs';
import { useRouter } from 'next/navigation';
import { grpc } from '@improbable-eng/grpc-web';
import './page.scss';


export default function NewBlog() {
	const { blogs_client } = useGrpc();
	const { token } = useAuth();
	const router = useRouter();
	const [content, setContent] = useState('');
	const [title, setTitle] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleCreate = async () => {
		if (!title.trim()) {
			alert('Please enter a title');
			return;
		}
		setIsLoading(true);
		try {
			await createBlog(title, content);
		} catch (error) {
			// Error is already logged in createBlog
			alert('Failed to create blog');
		} finally {
			setIsLoading(false);
		}
	};

	const createBlog = async (title: string, content: string) => {
		const req = CreateBlogRequest.create({ title, content })
		try {
			const resp = await blogs_client.CreateBlog(req, (token ? new grpc.Metadata({ authorization: token }) : undefined));
			router.push(`/admin/blogs/${resp.blog?.id}`);
		} catch (err) {
			console.error('Failed to create blog:', err);
			throw err;
		}

	}

	return (
		<div className="newBlogContainer">
			<div className="newBlogHeader">
				<input
					type="text"
					placeholder="Enter blog title..."
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="titleInput"
				/>
				<button
					onClick={handleCreate}
					disabled={isLoading}
					className="createButton"
				>
					{isLoading ? 'Creating...' : 'Create Blog'}
				</button>
			</div>
			<BlogEditor onContentChange={setContent} initialContent="" />
		</div>
	);
}
