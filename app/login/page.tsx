"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../AuthContext";
import styles from "../page.module.css";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError("Please enter both name and password.");
      return;
    }
    const user = login(name, password);
    if (user.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Presentation Rating</h1>
            <p className={styles.subtitle}>
              Sign in with a simple name and password. Use the admin account to
              create shareable rating links for presenters.
            </p>
          </div>
        </header>

        <section className={styles.contentSingle}>
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Login</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Name</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. admin or your name"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Password</span>
                  <input
                    className={styles.input}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="any password (admin for teacher)"
                  />
                </label>
              </div>
              {error && <p className={styles.errorText}>{error}</p>}
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                  Login
                </button>
              </div>
              <p className={styles.helperText}>
                Tip: log in as <span className={styles.codeInline}>admin</span>{" "}
                with any password to access the admin panel.
              </p>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}
