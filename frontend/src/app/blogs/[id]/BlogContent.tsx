'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PrismAsync, SyntaxHighlighterProps } from 'react-syntax-highlighter';
const SyntaxHighlighter = (PrismAsync as any) as React.FC<SyntaxHighlighterProps>;
import copy from 'copy-to-clipboard';
import { GetBlogResponse } from "@generated/blogs/blogs";
import { mermaidConfig } from '@/components/mermaidConfig';
import mermaid from 'mermaid';
import './Blog.scss';
import Loading from '@/components/Loading/Loading';

export default function BlogContent({ initialData }: { initialData: GetBlogResponse }) {
	const mermaidInitialized = useRef(false);

	useEffect(() => {
		if (!mermaidInitialized.current) {
			mermaid.initialize(mermaidConfig);
			mermaidInitialized.current = true;
		}
	}, []);

	useEffect(() => {
		if (initialData?.blog?.content) {
			mermaid.run({
				querySelector: '.mermaid'
			}).catch(error => console.error('Mermaid rendering error:', error));
		}
	}, [initialData]);

	if (!initialData || !initialData.blog) {
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
		<Suspense fallback={<Loading message={`${initialData.blog.title} is loading`} />}>
			<article className="blogContainer">
				<header className="blogHeader">
					<h1 className="blogTitle">{initialData.blog.title}</h1>
					<div className="blogMeta">
						<time dateTime={initialData.blog.createdAt?.toString()}>
							{initialData.blog.createdAt?.toLocaleDateString()}
						</time>
					</div>
					{initialData.blog.tags && (
						<div className="tagContainer">
							{initialData.blog.tags.map((tag, index) => (
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
							const [copied, setCopied] = useState(false);

							if (!match) {
								return (
									<code
										className="inline-code"
										{...props}
									>
										{children}
									</code>
								);
							}

							// Handle Mermaid diagrams
							if (match?.[1] === 'mermaid') {
								return (
									<div className="mermaid">
										{String(children).replace(/\n$/, '')}
									</div>
								);
							}

							const handleCopy = () => {
								copy(String(children));
								setCopied(true);
								setTimeout(() => setCopied(false), 2000);
							};

							return (
								<div className="code-block-container">
									<div className="code-block-header">
										{match?.[1] && (
											<span className="code-language">
												{match[1]}
											</span>
										)}
										<button
											onClick={handleCopy}
											className="copy-button"
											aria-label={copied ? 'Copied!' : 'Copy code'}
										>
											{copied ? '✓ Copied!' : 'Copy'}
										</button>
									</div>
									<SyntaxHighlighter
										{...props}
										style={vscDarkPlus}
										language={match?.[1] || 'text'}
										PreTag="div"
										customStyle={{
											margin: 0,
											borderRadius: '0 0 4px 4px',
											background: '#1e1e1e',
										}}
										showLineNumbers={true}
										wrapLines={true}
									>
										{String(children).replace(/\n$/, '')}
									</SyntaxHighlighter>
								</div>
							);
						}
					}}
				>
					{initialData.blog.content}
				</ReactMarkdown>
			</article>
		</Suspense>
	);
}
