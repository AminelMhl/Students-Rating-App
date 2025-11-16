"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { type Criterion, useEvaluation } from "../EvaluationContext";
import styles from "../page.module.css";

const SCORE_MAX = 5;

const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: "explainability",
    label: "Explainability",
    // description intentionally unused in UI
    description: "How well concepts were broken down and explained.",
    weight: 1,
  },
  {
    id: "clarity",
    label: "Clarity",
    description: "How clear and easy to follow the presentation was.",
    weight: 1,
  },
  {
    id: "content",
    label: "Content Quality",
    description: "Depth, accuracy, and organization of the content.",
    weight: 1,
  },
  {
    id: "engagement",
    label: "Engagement",
    description: "How well the presenter kept the audience engaged.",
    weight: 1,
  },
  {
    id: "timeManagement",
    label: "Time Management",
    description: "Pacing and use of the allotted time.",
    weight: 1,
  },
  {
    id: "delivery",
    label: "Delivery",
    description: "Voice, body language, and overall delivery.",
    weight: 1,
  },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { sessions, createSession } = useEvaluation();
  const [presenter, setPresenter] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!presenter.trim() || !user) return;

    const session = await createSession(
      presenter.trim(),
      user.name,
      DEFAULT_CRITERIA,
    );

    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const link = `${base}/session/${session.id}`;
    setLastLink(link);
    setPresenter("");
  };

  const enrichedSessions = useMemo(
    () =>
      sessions.map((session) => {
        if (!session.evaluations.length) {
          return {
            ...session,
            evaluationCount: 0,
            averageOverall: null as number | null,
          };
        }
        const sum = session.evaluations.reduce(
          (acc, evaluation) => acc + evaluation.overallScore,
          0,
        );
        return {
          ...session,
          evaluationCount: session.evaluations.length,
          averageOverall: sum / session.evaluations.length,
        };
      }),
    [sessions],
  );

  if (!user || user.role !== "admin") {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Admin only</h1>
              <p className={styles.subtitle}>
                This page is for the teacher or admin who creates rating links
                for presenters.
              </p>
            </div>
          </header>
          <section className={styles.contentSingle}>
            <section className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Please log in</h2>
              <p className={styles.emptyState}>
                Go to the{" "}
                <Link href="/login" className={styles.linkInline}>
                  login page
                </Link>{" "}
                and sign in as <span className={styles.codeInline}>admin</span>{" "}
                to create shareable rating links.
              </p>
            </section>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin dashboard</h1>
            <p className={styles.subtitle}>
              Create a rating page for each presenter, then share the link with
              your students. As ratings come in, their combined class rating
              updates automatically.
            </p>
          </div>
          <div className={styles.meta}>
            <span className={styles.metaChip}>
              Signed in as <strong>{user.name}</strong> (admin)
            </span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className={styles.content}>
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Create rating link</h2>
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
                  Create link
                </button>
              </div>
              {lastLink && (
                <p className={styles.helperText}>
                  Share this link with students:{" "}
                  <a
                    href={lastLink}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.linkInline}
                  >
                    {lastLink}
                  </a>
                </p>
              )}
            </form>
          </section>

          <section className={styles.summarySection}>
            <h2 className={styles.sectionTitle}>Active presenters</h2>
            {!enrichedSessions.length && (
              <p className={styles.emptyState}>
                No presenters yet. Create a rating link on the left to get
                started.
              </p>
            )}
            {enrichedSessions.length > 0 && (
              <ul className={styles.evaluationsList}>
                {enrichedSessions.map((session) => (
                  <li key={session.id} className={styles.evaluationCard}>
                    <div className={styles.evaluationHeader}>
                      <div>
                        <p className={styles.evaluationPresenter}>
                          {session.presenter}
                        </p>
                        <p className={styles.evaluationMeta}>
                          Created by {session.createdBy}
                        </p>
                        <p className={styles.evaluationMeta}>
                          {session.evaluationCount} rating
                          {session.evaluationCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className={styles.evaluationHeaderRight}>
                        {session.averageOverall !== null ? (
                          <p className={styles.evaluationScore}>
                            {session.averageOverall.toFixed(2)} / {SCORE_MAX}
                          </p>
                        ) : (
                          <p className={styles.evaluationScoreMuted}>
                            No ratings yet
                          </p>
                        )}
                        <Link
                          href={`/session/${session.id}`}
                          className={styles.linkInline}
                        >
                          Open rating page
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
