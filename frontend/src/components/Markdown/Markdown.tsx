import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import copy from 'copy-to-clipboard';

const DynamicSyntaxHighlighter = lazy(() => 
	import('react-syntax-highlighter').then(module => ({
		default: module.PrismAsync as any
	}))
);

const DynamicSpotify = lazy(() => 
	import('react-spotify-embed').then(module => ({
		default: module.Spotify
	}))
);

let vscDarkPlusStyle: any = null;
const loadVscDarkPlusStyle = async () => {
	if (!vscDarkPlusStyle) {
		const styleModule = await import('react-syntax-highlighter/dist/esm/styles/prism');
		vscDarkPlusStyle = styleModule.vscDarkPlus;
	}
	return vscDarkPlusStyle;
};

// Dynamic mermaid loading
let mermaidInstance: any = null;
const loadMermaid = async () => {
	if (!mermaidInstance) {
		const [mermaidModule, configModule] = await Promise.all([
			import('mermaid'),
			import('@/components/mermaidConfig')
		]);
		mermaidInstance = mermaidModule.default;
		mermaidInstance.initialize(configModule.mermaidConfig);
	}
	return mermaidInstance;
};

import styles from './Markdown.module.scss';

interface MarkdownProps {
	content: string;
}

export default function Markdown({ content }: MarkdownProps) {
	const mermaidInitialized = useRef(false);
	const [syntaxStyle, setSyntaxStyle] = useState<any>(null);

	useEffect(() => {
		const initializeMermaid = async () => {
			if (!mermaidInitialized.current) {
				try {
					const mermaidInstance = await loadMermaid();
					mermaidInitialized.current = true;
				} catch (error) {
					console.error('Failed to load mermaid:', error);
				}
			}
		};
		initializeMermaid();
	}, []);

	useEffect(() => {
		const renderMermaid = async () => {
			try {
				const mermaidInstance = await loadMermaid();
				await mermaidInstance.run({
					querySelector: '.mermaid'
				});
			} catch (error) {
				console.error('Mermaid rendering error:', error);
			}
		};
		renderMermaid();
	}, [content]);

	const CodeBlock = ({ match, children, copied, setCopied, ...props }: any) => {
		const [style, setStyle] = useState<any>(null);

		useEffect(() => {
			loadVscDarkPlusStyle().then(setStyle);
		}, []);

		const handleCopy = () => {
			copy(String(children));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		};

		if (!style) {
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
					<div className={styles.loadingCode}>Loading syntax highlighter...</div>
				</div>
			);
		}

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
				<Suspense fallback={<div className={styles.loadingCode}>Loading syntax highlighter...</div>}>
					<DynamicSyntaxHighlighter
						{...props}
						style={style}
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
					</DynamicSyntaxHighlighter>
				</Suspense>
			</div>
		);
	};

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
							<Suspense fallback={<div>Loading Spotify embed...</div>}>
								<DynamicSpotify link={spotifyUrl} wide height={300} style={{ marginBottom: "-75px" }} />
							</Suspense>
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

				return <CodeBlock match={match} copied={copied} setCopied={setCopied} {...props}>{children}</CodeBlock>;
			}
		}}
	>
		{content}
	</ReactMarkdown>)
}
