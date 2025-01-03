import React from 'react';
import Link from 'next/link';
import styles from './Button.module.scss';
import { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'terminal';
	size?: 'sm' | 'md' | 'lg';
	href?: string;
	isLoading?: boolean;
	isFullWidth?: boolean;
	icon?: React.ReactNode;
	className?: string;
}

export const Button: React.FC<ButtonProps> = ({
	children,
	variant = 'primary',
	size = 'md',
	href,
	isLoading = false,
	isFullWidth = false,
	icon,
	className = '',
	...props
}) => {
	const buttonClasses = `
    ${styles.button}
    ${styles[variant]}
    ${styles[size]}
    ${isFullWidth ? styles.fullWidth : ''}
    ${isLoading ? styles.loading : ''}
    ${className}
  `;

	const content = (
		<>
			{isLoading && (
				<span className={styles.loader}>
					<span className={styles.loaderDot}></span>
					<span className={styles.loaderDot}></span>
					<span className={styles.loaderDot}></span>
				</span>
			)}
			{icon && <span className={styles.icon}>{icon}</span>}
			{children}
		</>
	);

	if (href) {
		return (
			<Link href={href} className={buttonClasses}>
				{content}
			</Link>
		);
	}

	return (
		<button className={buttonClasses} disabled={isLoading} {...props}>
			{content}
		</button>
	);
};
