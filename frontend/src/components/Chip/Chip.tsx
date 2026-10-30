import styles from "./Chip.module.scss";

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * A tag pill. Renders as a <span> unless it is actually actionable, so chips
 * can safely live inside links/cards without nesting interactive elements.
 */
export function Chip({ label, selected = false, onClick }: ChipProps) {
  const className = [
    styles.chip,
    onClick ? styles.interactive : "",
    selected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        className={className}
        onClick={onClick}
        type="button"
        aria-pressed={selected}
      >
        {label}
      </button>
    );
  }

  return <span className={className}>{label}</span>;
}
