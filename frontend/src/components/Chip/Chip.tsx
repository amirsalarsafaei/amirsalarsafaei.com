import styles from './Chip.module.scss';

interface ChipProps {
    label: string;
    selected?: boolean;
    onClick?: () => void;
}

export function Chip({ label, selected = false, onClick }: ChipProps) {
    return (
        <button 
            className={`${styles.chip} ${selected ? styles.selected : ''}`}
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    );
}

