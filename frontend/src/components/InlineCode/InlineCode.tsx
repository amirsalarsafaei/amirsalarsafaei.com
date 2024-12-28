import styles from './InlineCode.module.scss';

interface InlineCodeProps {
  children: React.ReactNode;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children }) => {
  return <code className={styles.inlineCode}>{children}</code>;
};
