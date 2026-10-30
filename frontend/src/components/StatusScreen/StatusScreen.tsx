"use client";

import Link from "next/link";
import { say } from "cowsay";

import styles from "./StatusScreen.module.scss";

interface StatusScreenProps {
  code: string;
  title: string;
  message: string;
  detail?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * Shared terminal-flavoured screen for 404s and runtime errors. Keeping both
 * on the same chrome makes an otherwise jarring state feel intentional.
 */
export default function StatusScreen({
  code,
  title,
  message,
  detail,
  actionLabel,
  actionHref,
  onAction,
}: StatusScreenProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.terminal}>
        <div className={styles.header}>
          <div className={styles.buttons} aria-hidden>
            <span className={styles.close} />
            <span className={styles.minimize} />
            <span className={styles.maximize} />
          </div>
          <span className={styles.title}>{title} — zsh</span>
        </div>

        <div className={styles.body} role="alert">
          <div className={styles.prompt}>
            <span className={styles.user}>visitor</span>
            <span className={styles.dim}>@</span>
            <span className={styles.host}>amirsalar</span>
            <span className={styles.dim}>:</span>
            <span className={styles.path}>~</span>
            <span className={styles.dollar}>$</span>{" "}
            <span className={styles.command}>curl -I localhost/{code}</span>
          </div>

          <pre className={styles.cow}>{say({ text: message })?.trimEnd()}</pre>

          {detail && <p className={styles.detail}>{detail}</p>}

          {(actionHref || onAction) && (
            <div className={styles.actions}>
              {actionHref ? (
                <Link href={actionHref} className={styles.action}>
                  {actionLabel ?? "Go home"} <span aria-hidden>→</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.action}
                  onClick={onAction}
                >
                  {actionLabel ?? "Try again"} <span aria-hidden>↻</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
