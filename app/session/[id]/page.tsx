"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useEvaluation } from "../../EvaluationContext";
import styles from "../../page.module.css";

type CriterionId =
  | "explainability"
  | "clarity"
  | "content"
  | "engagement"
  | "timeManagement"
  | "delivery";

type Criterion = {
  id: CriterionId;
  label: string;
  description: string;
  weight: number;
};

const CRITERIA: Criterion[] = [
  {
    id: "explainability",
    label: "Explainability",
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

const SCORE_MIN = 1;
const SCORE_MAX = 5;

const totalWeight = CRITERIA.reduce((sum, c) => sum + c.weight, 0);

export default function SessionRatingPage() {
  const params = useParams<{ id: string }>();
  const { getSession, addEvaluation, loaded } = useEvaluation();
  const session = getSession(params.id);

  const [evaluator, setEvaluator] = useState("");
  const [currentRatings, setCurrentRatings] = useState<
    Partial<Record<CriterionId, number>>
  >({});

  const allCriteriaRated = useMemo(
    () => CRITERIA.every((c) => typeof currentRatings[c.id] === "number"),
    [currentRatings],
  );

  const currentOverallScore = useMemo(() => {
    if (!allCriteriaRated) return null;
    const weightedSum = CRITERIA.reduce(
      (sum, c) => sum + (currentRatings[c.id] ?? 0) * c.weight,
      0,
    );
    return weightedSum / totalWeight;
  }, [allCriteriaRated, currentRatings]);

  const summaryByCriterion = useMemo(() => {
    if (!session || !session.evaluations.length) return null;

    return CRITERIA.map((criterion) => {
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
  }, [session]);

  const overallAverageScore = useMemo(() => {
    if (!session || !session.evaluations.length) return null;
    const sum = session.evaluations.reduce(
      (acc, evaluation) => acc + evaluation.overallScore,
      0,
    );
    return sum / session.evaluations.length;
  }, [session]);

  const handleRatingChange = (criterionId: CriterionId, value: number) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !evaluator.trim() || !allCriteriaRated) {
      return;
    }

    const ratings = currentRatings as Record<CriterionId, number>;
    const weightedSum = CRITERIA.reduce(
      (sum, c) => sum + ratings[c.id] * c.weight,
      0,
    );
    const overallScore = weightedSum / totalWeight;

    await addEvaluation(session.id, evaluator.trim(), ratings, overallScore);

    setEvaluator("");
    setCurrentRatings({});
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
              <span className={styles.metaChip}>
                Class average: {overallAverageScore.toFixed(2)} / {SCORE_MAX}
              </span>
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
                  />
                </label>
              </div>

              <div className={styles.criteriaList}>
                {CRITERIA.map((criterion) => {
                  const selectedValue = currentRatings[criterion.id];

                  return (
                    <div key={criterion.id} className={styles.criterionRow}>
                      <div className={styles.criterionText}>
                        <span className={styles.criterionLabel}>
                          {criterion.label}
                        </span>
                        <span className={styles.criterionDescription}>
                          {criterion.description}
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
                    disabled={!evaluator.trim() || !allCriteriaRated}
                  >
                    Submit rating
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
