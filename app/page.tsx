"use client";

import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { type Criterion, useEvaluation } from "./EvaluationContext";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const { createSession } = useEvaluation();

  const [presenter, setPresenter] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([
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
  ]);

  const handleCriterionChange = (index: number, value: string) => {
    setCriteria((prev) =>
      prev.map((criterion, i) =>
        i === index ? { ...criterion, label: value } : criterion,
      ),
    );
  };

  const handleAddCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        id: `custom_${prev.length + 1}`,
        label: "New criterion",
        description: "Describe what you want to rate.",
        weight: 1,
      },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!presenter.trim()) return;

    const create = async () => {
      const session = await createSession(
        presenter.trim(),
        "Teacher",
        criteria,
      );

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

              <div className={styles.criteriaEditor}>
                <span className={styles.criteriaEditorLabel}>
                  Criteria for this rating
                </span>
                <span className={styles.criteriaEditorHint}>
                  Edit, remove, or add criterion names before creating the link.
                </span>
                <div className={styles.criteriaList}>
                  {criteria.map((criterion, index) => (
                    <div
                      key={criterion.id}
                      className={`${styles.criterionRow} ${styles.criteriaEditorRow}`}
                    >
                      <div
                        className={`${styles.criterionText} ${styles.criteriaEditorText}`}
                      >
                        <input
                          className={styles.input}
                          type="text"
                          value={criterion.label}
                          onChange={(event) =>
                            handleCriterionChange(index, event.target.value)
                          }
                          placeholder="Criterion name"
                        />
                      </div>
                      {criteria.length > 1 && (
                        <button
                          type="button"
                          className={`${styles.secondaryButton} ${styles.criteriaEditorRemove}`}
                          onClick={() => handleRemoveCriterion(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleAddCriterion}
                  >
                    Add criterion
                  </button>
                </div>
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
                <>
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
                  {lastLink && (
                    <div className={styles.qrBlock}>
                      <p className={styles.helperText}>Or scan this QR code:</p>
                      <div className={styles.qrBox}>
                        <QRCodeSVG
                          value={lastLink}
                          size={132}
                          bgColor="transparent"
                          fgColor="#38bdf8"
                          level="M"
                          includeMargin
                        />
                      </div>
                    </div>
                  )}
                </>
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
