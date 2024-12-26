'use client';

import { blogs_client } from "@/clients/grpc";
import { GetBlogRequest, GrpcWebError } from "@generated/blogs/blogs";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation"
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import './Blog.scss';
import Loading from "@/shared/Loading/Loading";

export { generateMetadata } from './page.metadata';

export default function BlogPage() {
	const params = useParams();
	const id = params.id as string;
	const mermaidInitialized = useRef(false);

	useEffect(() => {
		if (!mermaidInitialized.current) {
			mermaid.initialize({
				startOnLoad: false,
				theme: 'dark',
				securityLevel: 'loose',
				themeVariables: {
					darkMode: true,
					background: '#0a0c0b', // $primary-bg
					primaryColor: '#2bbc8a', // $secondary-color
					secondaryColor: '#36b37e', // $accent-color
					tertiaryColor: '#1c2721', // $hover-color
					primaryTextColor: '#dfe4ea', // $blog-text-color
					secondaryTextColor: '#98a3a0', // $text-color
					lineColor: '#4ae168', // $highlight-color
					fontSize: '16px',
					fontFamily: '"Fira Code", monospace', // $code-font
					curve: 'basis', // Smoother lines
					cornerRadius: '10',
					messageFontWeight: '400',
					wrap: true,
					flowchart: {
						htmlLabels: true,
						curve: 'basis',
						nodeSpacing: 50,
						rankSpacing: 50,
						padding: 15,
						useMaxWidth: true,
						diagramPadding: 8,
						cornerRadius: '10'
					},
					themeCSS: `
						g.classGroup rect {
							rx: 10;
							ry: 10;
						}
						.node rect, .node circle, .node ellipse, .node polygon, .node path {
							rx: 10;
							ry: 10;
							stroke-width: 2px;
						}
						.node .label {
							font-weight: normal;
						}
						.edgePath .path {
							stroke-width: 2px;
						}
						.cluster rect {
							rx: 10;
							ry: 10;
							stroke-width: 2px;
						}
					`
				}
			});
			mermaidInitialized.current = true;
		}
	}, []);

	const getBlog = async () => {
		let req = GetBlogRequest.create({ id });
		try {
			return await blogs_client.GetBlog(req);
		} catch (error) {
			console.log(error);
			if (error instanceof GrpcWebError) {
				console.error('gRPC Error: ', error.message, error.code);
				throw error;
			}
			throw error;
		}
	};

	const { isFetching, data, isLoadingError } = useQuery({
		queryKey: ["get-blog", id],
		queryFn: getBlog,
	});

	useEffect(() => {
		if (data?.blog?.content) {
			mermaid.run({
				querySelector: '.mermaid'
			}).catch(error => console.error('Mermaid rendering error:', error));
		}
	}, [data]);

	const renderContent = () => {
		if (isFetching) {
			return <Loading message="Loading the blog" />;
		}

		if (isLoadingError) {
			return (
				<div className="messageContainer">
					<div className="message">Error loading blog</div>
					<div className="subMessage">
						Something went wrong while fetching the blog post.
						<br />
						Please try again later or contact support if the problem persists.
					</div>
				</div>
			);
		}

		if (!data || !data.blog) {
			return (
				<div className="messageContainer">
					<div className="message">Blog not found</div>
					<div className="subMessage">
						The blog post you're looking for doesn't exist or has been removed.
						<br />
						Please check the URL and try again.
					</div>
				</div>
			);
		}

		return (
			<article className="blogContainer">
				<header className="blogHeader">
					<h1 className="blogTitle">{data.blog.title}</h1>
					<div className="blogMeta">
						<time dateTime={data.blog.createdAt?.toString()}>
							{data.blog.createdAt?.toLocaleDateString()}
						</time>
					</div>
					{data.blog.tags && (
						<div className="tagContainer">
							{data.blog.tags.map((tag, index) => (
								<span key={index} className="tag">{tag}</span>
							))}
						</div>
					)}
				</header>

				<ReactMarkdown
					className="markdown"
					remarkPlugins={[remarkGfm]}
					rehypePlugins={[rehypeRaw]}
					components={{
						code({ node, className, children, ...props }) {
							const match = /language-(\w+)/.exec(className || '');
							if (match?.[1] === 'mermaid') {
								return (
									<div className="mermaid">
										{String(children).replace(/\n$/, '')}
									</div>
								);
							}
							return (
								<code className={className} {...props}>
									{children}
								</code>
							);
						}
					}}
				>
					{data.blog.content}
				</ReactMarkdown>
			</article>
		);
	};

	return (
		<>
			{renderContent()}
		</>
	);
}
