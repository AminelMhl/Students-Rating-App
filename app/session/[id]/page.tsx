"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type Session, useEvaluation } from "../../EvaluationContext";
import styles from "../../page.module.css";

const SCORE_MIN = 1;
const SCORE_MAX = 5;

export default function SessionRatingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getSession, addEvaluation, loaded } = useEvaluation();
  const [session, setSession] = useState<Session | null>(null);

  const [evaluator, setEvaluator] = useState("");
  const [currentRatings, setCurrentRatings] = useState<
    Partial<Record<string, number>>
  >({});
  const [hasVoted, setHasVoted] = useState(false);

  const criteria = session?.criteria ?? [];

  const totalWeight = useMemo(
    () =>
      criteria.length === 0
        ? 1
        : criteria.reduce((sum, criterion) => sum + (criterion.weight ?? 1), 0),
    [criteria],
  );

  const allCriteriaRated = useMemo(
    () => criteria.every((c) => typeof currentRatings[c.id] === "number"),
    [criteria, currentRatings],
  );

  const currentOverallScore = useMemo(() => {
    if (!allCriteriaRated) return null;
    const weightedSum = criteria.reduce(
      (sum, c) => sum + (currentRatings[c.id] ?? 0) * c.weight,
      0,
    );
    return weightedSum / totalWeight;
  }, [allCriteriaRated, currentRatings, criteria, totalWeight]);

  const summaryByCriterion = useMemo(() => {
    if (!session || !session.evaluations.length) return null;

    return criteria.map((criterion) => {
      const values = session.evaluations
        .map((evaluation) => evaluation.ratings[criterion.id])
        .filter((value) => typeof value === "number");

      if (!values.length) {
        return {
          id: criterion.id,
          label: criterion.label,
          average: 0,
        };
      }

      const sum = values.reduce((acc, value) => acc + value, 0);
      const average = sum / values.length;

      return {
        id: criterion.id,
        label: criterion.label,
        average,
      };
    });
  }, [session, criteria]);

  const overallAverageScore = useMemo(() => {
    if (!session || !session.evaluations.length) return null;
    const sum = session.evaluations.reduce(
      (acc, evaluation) => acc + evaluation.overallScore,
      0,
    );
    return sum / session.evaluations.length;
  }, [session]);

  const handleRatingChange = (criterionId: string, value: number) => {
    setCurrentRatings((prev) => ({
      ...prev,
      [criterionId]: value,
    }));
  };

  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "rating_owned_sessions";
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    try {
      const owned = JSON.parse(stored) as string[];
      if (owned.includes(params.id)) {
        setIsOwner(true);
      }
    } catch {
      // ignore
    }
  }, [params.id]);

  useEffect(() => {
    if (!loaded) return;

    setSession(getSession(params.id) ?? null);

    let cancelled = false;

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${params.id}`);
        if (!response.ok) return;
        const data = (await response.json()) as Session;
        if (!cancelled) {
          setSession(data);
        }
      } catch {
        // ignore polling errors
      }
    };

    // initial fetch and polling
    void fetchSession();
    const intervalId = window.setInterval(fetchSession, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [loaded, getSession, params.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `rating_voted_${params.id}`;
    const stored = window.localStorage.getItem(key);
    setHasVoted(stored === "1");
  }, [params.id]);

  const handleDelete = async () => {
    if (!session) return;
    const confirmed = window.confirm(
      "Delete this rating session and all its votes? This cannot be undone.",
    );
    if (!confirmed) return;

    const response = await fetch(`/api/sessions/${session.id}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      window.alert("Failed to delete session. Please try again.");
      return;
    }

    if (typeof window !== "undefined") {
      const key = "rating_owned_sessions";
      const stored = window.localStorage.getItem(key);
      if (stored) {
        try {
          const owned = JSON.parse(stored) as string[];
          const next = owned.filter((value) => value !== session.id);
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
    }

    router.push("/");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !evaluator.trim() || !allCriteriaRated) {
      return;
    }

    const ratings = currentRatings as Record<string, number>;
    const weightedSum = criteria.reduce(
      (sum, c) => sum + ratings[c.id] * c.weight,
      0,
    );
    const overallScore = weightedSum / totalWeight;

    const updated = await addEvaluation(
      session.id,
      evaluator.trim(),
      ratings,
      overallScore,
    );

    if (updated) {
      setSession(updated);
    }

    if (typeof window !== "undefined") {
      const key = `rating_voted_${session.id}`;
      window.localStorage.setItem(key, "1");
    }
    setHasVoted(true);
  };

  if (!loaded) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Loading rating page…</h1>
              <p className={styles.subtitle}>
                Please wait while we load the presenter&apos;s information.
              </p>
            </div>
          </header>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Rating page not found</h1>
              <p className={styles.subtitle}>
                This link does not match any existing presenter. Ask your
                teacher to create a new link.
              </p>
            </div>
          </header>
          <section className={styles.contentSingle}>
            <section className={styles.formSection}>
              <p className={styles.emptyState}>
                Teachers can create rating links in the{" "}
                <Link href="/admin" className={styles.linkInline}>
                  admin dashboard
                </Link>
                .
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
            <h1 className={styles.title}>Rate {session.presenter}</h1>
            <p className={styles.subtitle}>
              Fill in your name and rate this presenter on a 1–5 scale. Your
              rating is added to the class average.
            </p>
          </div>
          <div className={styles.meta}>
            <span className={styles.metaChip}>
              {session.evaluations.length} voter
              {session.evaluations.length === 1 ? "" : "s"} so far
            </span>
            {overallAverageScore !== null && (
              <span className={styles.metaChipHighlight}>
                <span className={styles.metaChipHighlightLabel}>
                  Class average
                </span>
                <span className={styles.metaChipHighlightValue}>
                  {overallAverageScore.toFixed(2)} / {SCORE_MAX}
                </span>
              </span>
            )}
            {isOwner && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleDelete}
              >
                Delete rating
              </button>
            )}
          </div>
        </header>

        <section className={styles.content}>
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Your rating</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Your name</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={evaluator}
                    onChange={(event) => setEvaluator(event.target.value)}
                    placeholder="e.g. Student name"
                    disabled={hasVoted}
                  />
                </label>
              </div>

              <div className={styles.criteriaList}>
                {criteria.map((criterion) => {
                  const selectedValue = currentRatings[criterion.id];

                  return (
                    <div key={criterion.id} className={styles.criterionRow}>
                      <div className={styles.criterionText}>
                        <span className={styles.criterionLabel}>
                          {criterion.label}
                        </span>
                      </div>
                      <div className={styles.scoreButtons}>
                        {Array.from(
                          { length: SCORE_MAX - SCORE_MIN + 1 },
                          (_, index) => {
                            const value = SCORE_MIN + index;
                            const isSelected = selectedValue === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                className={`${styles.scoreButton} ${
                                  isSelected ? styles.scoreButtonSelected : ""
                                }`}
                                onClick={() =>
                                  handleRatingChange(criterion.id, value)
                                }
                              >
                                {value}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.formFooter}>
                <div className={styles.currentScore}>
                  {currentOverallScore !== null ? (
                    <>
                      <span className={styles.currentScoreLabel}>
                        Your overall score:
                      </span>
                      <span className={styles.currentScoreValue}>
                        {currentOverallScore.toFixed(2)} / {SCORE_MAX}
                      </span>
                    </>
                  ) : (
                    <span className={styles.currentScoreHint}>
                      Rate all criteria to see the overall score.
                    </span>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={
                      hasVoted || !evaluator.trim() || !allCriteriaRated
                    }
                  >
                    {hasVoted ? "You already voted" : "Submit rating"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className={styles.summarySection}>
            <h2 className={styles.sectionTitle}>Class summary</h2>

            {!session.evaluations.length && (
              <p className={styles.emptyState}>
                No ratings yet. After you submit, your rating and the class
                average will appear here.
              </p>
            )}

            {summaryByCriterion && (
              <div className={styles.summaryBlock}>
                <h3 className={styles.summaryTitle}>Average by criterion</h3>
                <ul className={styles.summaryList}>
                  {summaryByCriterion.map((item) => (
                    <li key={item.id} className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>{item.label}</span>
                      <span className={styles.summaryScore}>
                        {item.average.toFixed(2)} / {SCORE_MAX}
                      </span>
                      <div className={styles.summaryBarTrack}>
                        <div
                          className={styles.summaryBarFill}
                          style={{
                            width: `${(item.average / SCORE_MAX) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isOwner && session.evaluations.length > 0 && (
              <div className={styles.summaryBlock}>
                <h3 className={styles.summaryTitle}>Participants</h3>
                <ul className={styles.evaluationsList}>
                  {session.evaluations.map((evaluation) => (
                    <li key={evaluation.id} className={styles.evaluationCard}>
                      <div className={styles.evaluationHeader}>
                        <div>
                          <p className={styles.evaluationPresenter}>
                            {evaluation.evaluator}
                          </p>
                          <p className={styles.evaluationMeta}>
                            Joined at{" "}
                            {new Date(evaluation.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
