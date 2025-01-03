import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { PrismAsync, SyntaxHighlighterProps } from 'react-syntax-highlighter';
const SyntaxHighlighter = (PrismAsync as any) as React.FC<SyntaxHighlighterProps>;
import { Spotify } from 'react-spotify-embed';


import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import copy from 'copy-to-clipboard';
import mermaid from 'mermaid';
import { mermaidConfig } from '@/components/mermaidConfig';

import styles from './Markdown.module.scss';

interface MarkdownProps {
	content: string;
}

export default function Markdown({ content }: MarkdownProps) {

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
	}, [content]);


	return (<ReactMarkdown
		className={styles.markdown}
		remarkPlugins={[remarkGfm]}
		rehypePlugins={[rehypeRaw]}
		components={{
			code({ node, className, children, ...props }) {
				const match = /language-(\w+)/.exec(className || '');
				const [copied, setCopied] = useState(false);

				if (!match) {
					return (
						<code
							className={styles.inlineCode}
							{...props}
						>
							{children}
						</code>
					);
				}

				if (match?.[1].startsWith("spotify")) {
					const spotifyUrl = String(children).trim();
					const isValidSpotifyUrl = /^https:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/[a-zA-Z0-9]+/.test(spotifyUrl);

					if (isValidSpotifyUrl) {
						return <div style={{ overflow: "hidden" }}>
							<Spotify link={spotifyUrl} wide height={300} style={{ marginBottom: "-75px" }} />
						</div>;
					} else {
						return (
							<div className={styles.spotifyError}>
								Invalid Spotify URL. Please use a valid Spotify share link.
							</div>
						);
					}
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
					<div className={styles.codeBlockContainer}>
						<div className={styles.codeBlockHeader}>
							{match?.[1] && (
								<span className={styles.codeLanguage}>
									{match[1]}
								</span>
							)}
							<button
								onClick={handleCopy}
								className={styles.copyButton}
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
		{content}
	</ReactMarkdown>)
}
