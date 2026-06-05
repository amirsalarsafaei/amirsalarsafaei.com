"use client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

import styles from "./page.module.scss";
export default function AdminPage() {
  const { token, setToken } = useAuth();
  const [tokenFieldValue, setTokenFieldValue] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);

  const handleChangeToken = (newToken: string | null) => {
    if (!newToken || newToken.length === 0) {
      setError("Token cannot be empty!");
    }

    setToken(newToken);
  };

  return (
    <div className={styles.formContainer}>
      {token && <h3>Token Already Set</h3>}
      <div>
        <label>Auth Token:</label>
        <input
          type="password"
          placeholder="enter the auth token"
          onChange={(e) => setTokenFieldValue(e.target.value)}
        />
        <p className="form-error">{error}</p>
      </div>
      <button
        className="btn"
        type="submit"
        onClick={() => handleChangeToken(tokenFieldValue)}
      >
        {" "}
        Change{" "}
      </button>
    </div>
  );
}
