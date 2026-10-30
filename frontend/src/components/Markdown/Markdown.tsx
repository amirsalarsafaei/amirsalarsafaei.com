import {
  ReactNode,
  ComponentType,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import copy from "copy-to-clipboard";

const DynamicSyntaxHighlighter = lazy(() =>
  import("react-syntax-highlighter").then((module) => ({
    default: module.PrismAsync as any,
  })),
) as ComponentType<any>;

const DynamicSpotify = lazy(() =>
  import("react-spotify-embed").then((module) => ({
    default: module.Spotify,
  })),
) as ComponentType<any>;

let vscDarkPlusStyle: any = null;
const loadVscDarkPlusStyle = async () => {
  if (!vscDarkPlusStyle) {
    const styleModule = await import(
      "react-syntax-highlighter/dist/esm/styles/prism"
    );
    vscDarkPlusStyle = styleModule.vscDarkPlus;
  }
  return vscDarkPlusStyle;
};

// Dynamic mermaid loading
let mermaidInstance: any = null;
const loadMermaid = async () => {
  if (!mermaidInstance) {
    const [mermaidModule, configModule] = await Promise.all([
      import("mermaid"),
      import("@/components/mermaidConfig"),
    ]);
    mermaidInstance = mermaidModule.default;
    mermaidInstance.initialize(configModule.mermaidConfig);
  }
  return mermaidInstance;
};

import styles from "./Markdown.module.scss";

interface MarkdownProps {
  content: string;
}

interface CodeBlockProps {
  language: string;
  style: any;
  children: ReactNode;
}

/**
 * Fenced code block with a copy affordance. Defined at module scope so the
 * copied state survives parent re-renders (an inline component with hooks gets
 * remounted on every render).
 */
function CodeBlock({ language, style, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = () => {
    copy(String(children));
    setCopied(true);

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeBlockContainer}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeLanguage}>{language || "text"}</span>
        <button
          onClick={handleCopy}
          className={styles.copyButton}
          aria-label={copied ? "Copied!" : "Copy code"}
          type="button"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>

      {style ? (
        <Suspense
          fallback={<div className={styles.loadingCode}>loading highlighter</div>}
        >
          <DynamicSyntaxHighlighter
            style={style}
            language={language || "text"}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: "0 0 6px 6px",
              background: "#101514",
            }}
            showLineNumbers={true}
            wrapLines={true}
          >
            {String(children).replace(/\n$/, "")}
          </DynamicSyntaxHighlighter>
        </Suspense>
      ) : (
        <div className={styles.loadingCode}>loading highlighter</div>
      )}
    </div>
  );
}

export default function Markdown({ content }: MarkdownProps) {
  const mermaidInitialized = useRef(false);
  const [syntaxStyle, setSyntaxStyle] = useState<any>(null);

  useEffect(() => {
    loadVscDarkPlusStyle().then(setSyntaxStyle);
  }, []);

  useEffect(() => {
    const initializeMermaid = async () => {
      if (!mermaidInitialized.current) {
        try {
          await loadMermaid();
          mermaidInitialized.current = true;
        } catch (error) {
          console.error("Failed to load mermaid:", error);
        }
      }
    };
    initializeMermaid();
  }, []);

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        const mermaid = await loadMermaid();
        await mermaid.run({ querySelector: ".mermaid" });
      } catch (error) {
        console.error("Mermaid rendering error:", error);
      }
    };
    renderMermaid();
  }, [content]);

  return (
    <ReactMarkdown
      className={styles.markdown}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match?.[1];

          if (!language) {
            return (
              <code className={styles.inlineCode} {...props}>
                {children}
              </code>
            );
          }

          if (language.startsWith("spotify")) {
            const spotifyUrl = String(children).trim();
            const isValidSpotifyUrl =
              /^https:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/[a-zA-Z0-9]+/.test(
                spotifyUrl,
              );

            if (isValidSpotifyUrl) {
              return (
                <div className={styles.spotifyEmbed}>
                  <Suspense fallback={<div>Loading Spotify embed...</div>}>
                    <DynamicSpotify
                      link={spotifyUrl}
                      wide
                      height={300}
                      style={{ marginBottom: "-75px" }}
                    />
                  </Suspense>
                </div>
              );
            }

            return (
              <div className={styles.spotifyError}>
                Invalid Spotify URL. Please use a valid Spotify share link.
              </div>
            );
          }

          if (language === "mermaid") {
            return (
              <div className="mermaid">
                {String(children).replace(/\n$/, "")}
              </div>
            );
          }

          return (
            <CodeBlock language={language} style={syntaxStyle}>
              {children}
            </CodeBlock>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
