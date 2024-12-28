import styles from './CodeBlock.module.scss';

interface CodeBlockProps {
  children: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, language }) => {
  return (
    <pre className={styles.codeBlock}>
      <code className={language ? `language-${language}` : ''}>
        {children}
      </code>
    </pre>
  );
};
