"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/Button/Button";

import styles from "./page.module.scss";

export default function AdminPage() {
  const { token, setToken } = useAuth();
  const [tokenFieldValue, setTokenFieldValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <div className={styles.page}>
      <form
        className={styles.card}
        onSubmit={(event) => {
          event.preventDefault();

          const nextToken = tokenFieldValue.trim();

          if (!nextToken) {
            setError("Token cannot be empty.");
            setSaved(false);
            return;
          }

          setToken(nextToken);
          setTokenFieldValue("");
          setError(null);
          setSaved(true);
        }}
      >
        <div className={styles.cardHeader}>
          <span className={styles.dot} aria-hidden />
          <span>admin_auth — zsh</span>
        </div>

        <div className={styles.cardBody}>
          <p className={styles.prompt}>
            <span className={styles.dollar}>$</span> auth status
          </p>

          <p className={styles.status}>
            {token ? (
              <>
                token <span className={styles.ok}>configured</span>
              </>
            ) : (
              <>
                no token <span className={styles.muted}>configured</span>
              </>
            )}
          </p>

          <div className={styles.field}>
            <label htmlFor="auth-token">Auth token</label>
            <input
              id="auth-token"
              type="password"
              placeholder="paste the admin token"
              autoComplete="current-password"
              value={tokenFieldValue}
              onChange={(event) => {
                setTokenFieldValue(event.target.value);
                if (error) setError(null);
                if (saved) setSaved(false);
              }}
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            {saved && !error && (
              <p className={styles.success} role="status">
                Token saved for this browser.
              </p>
            )}
          </div>

          <div className={styles.actions}>
            <Button type="submit" variant="primary">
              Save token
            </Button>
            {token && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setToken(null);
                  setSaved(false);
                  setError(null);
                }}
              >
                Clear token
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
