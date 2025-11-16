"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEvaluation } from "./EvaluationContext";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const { createSession } = useEvaluation();

  const [presenter, setPresenter] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!presenter.trim()) return;

    const create = async () => {
      const session = await createSession(presenter.trim(), "Teacher");

      if (typeof window !== "undefined") {
        const base = window.location.origin;
        setLastLink(`${base}/session/${session.id}`);

        const key = "rating_owned_sessions";
        const stored = window.localStorage.getItem(key);
        let owned: string[] = [];
        if (stored) {
          try {
            owned = JSON.parse(stored) as string[];
          } catch {
            owned = [];
          }
        }
        if (!owned.includes(session.id)) {
          window.localStorage.setItem(
            key,
            JSON.stringify([...owned, session.id]),
          );
        }
      }

      setLastCode(session.id);
      setPresenter("");
    };

    void create();
  };

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    router.push(`/session/${code}`);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Presentation Rating</h1>
            <p className={styles.subtitle}>
              Create a rating page for a presenter and share it with the class,
              or join an existing rating session using a code or link.
            </p>
          </div>
        </header>

        <section className={styles.content}>
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Create rating</h2>
            <form className={styles.form} onSubmit={handleCreate}>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Presenter name</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={presenter}
                    onChange={(event) => setPresenter(event.target.value)}
                    placeholder="e.g. Alice Johnson"
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!presenter.trim()}
                >
                  Create rating page
                </button>
              </div>

              {lastCode && (
                <p className={styles.helperText}>
                  Share this code with your class:{" "}
                  <span className={styles.codeInline}>{lastCode}</span>
                  {lastLink && (
                    <>
                      {" "}
                      or this link:{" "}
                      <a
                        href={lastLink}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.linkInline}
                      >
                        {lastLink}
                      </a>
                      .
                    </>
                  )}
                </p>
              )}
            </form>
          </section>

          <section className={styles.summarySection}>
            <h2 className={styles.sectionTitle}>Participate</h2>
            <form className={styles.form} onSubmit={handleJoin}>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Enter code</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    placeholder="Paste or type the code here"
                  />
                </label>
              </div>
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!joinCode.trim()}
                >
                  Join rating
                </button>
              </div>
            </form>
            <p className={styles.helperText}>
              You can also open a rating page directly if someone sends you a
              link like{" "}
              <span className={styles.codeInline}>
                https://.../session/&lt;code&gt;
              </span>
              .
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
