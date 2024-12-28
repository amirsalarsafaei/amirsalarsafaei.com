'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { PrismAsync, SyntaxHighlighterProps } from 'react-syntax-highlighter';
const SyntaxHighlighter = (PrismAsync as any) as React.FC<SyntaxHighlighterProps>;

import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import copy from 'copy-to-clipboard';
import mermaid from 'mermaid';
import { mermaidConfig } from '@/components/mermaidConfig';
import './BlogEditor.scss';

interface BlogEditorProps {
	onContentChange: (content: string) => void;
	initialContent: string;
}

export default function BlogEditor({ onContentChange, initialContent = '' }: BlogEditorProps) {
	const [markdown, setMarkdown] = useState(initialContent);
	const mermaidInitialized = useRef(false);

	useEffect(() => {
		if (!mermaidInitialized.current) {
			mermaid.initialize(mermaidConfig);
			mermaidInitialized.current = true;
		}
	}, []);

	useEffect(() => {
		mermaid.run({
			querySelector: '.mermaid'
		}).catch(error => console.error('Mermaid rendering error:', error));
	}, [markdown]);


	return (
		<div className="editorContent">
			<div className="editorPane">
				<textarea
					value={markdown}
					onChange={(e) => {
						setMarkdown(e.target.value);
						onContentChange(e.target.value);
					}}
					placeholder="Write your markdown here..."
					className="markdownInput"
				/>
			</div>
			<div className="previewPane">
				<ReactMarkdown
					className="markdown"
					remarkPlugins={[remarkGfm]}
					rehypePlugins={[rehypeRaw]}
					components={{
						code({ node,  className, children, ...props }) {
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
					{markdown}
				</ReactMarkdown>
			</div>
		</div>
	);
}
