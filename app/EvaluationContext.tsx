"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Criterion = {
  id: string;
  label: string;
  description: string;
  weight: number;
};

type Evaluation = {
  id: string;
  evaluator: string;
  ratings: Record<string, number>;
  overallScore: number;
  createdAt: string;
};

export type Session = {
  id: string;
  presenter: string;
  createdBy: string;
  createdAt: string;
  criteria: Criterion[];
  evaluations: Evaluation[];
};

type EvaluationContextValue = {
  sessions: Session[];
  loaded: boolean;
  createSession: (
    presenter: string,
    createdBy: string,
    criteria: Criterion[],
  ) => Promise<Session>;
  addEvaluation: (
    sessionId: string,
    evaluator: string,
    ratings: Record<string, number>,
    overallScore: number,
  ) => Promise<Session | null>;
  getSession: (id: string) => Session | undefined;
};

const EvaluationContext = createContext<EvaluationContextValue | undefined>(
  undefined,
);

export function EvaluationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        const response = await fetch("/api/sessions");
        if (!response.ok) return;
        const data = (await response.json()) as Session[];
        if (!cancelled) {
          setSessions(data);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<EvaluationContextValue>(() => {
    const createSession = async (
      presenter: string,
      createdBy: string,
      criteria: Criterion[],
    ): Promise<Session> => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presenter,
          createdBy,
          criteria,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const session = (await response.json()) as Session;
      setSessions((prev) => [
        session,
        ...prev.filter((s) => s.id !== session.id),
      ]);
      return session;
    };

    const addEvaluation = async (
      sessionId: string,
      evaluator: string,
      ratings: Record<string, number>,
      overallScore: number,
    ): Promise<Session | null> => {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          evaluator,
          ratings,
          overallScore,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const updated = (await response.json()) as Session;
      setSessions((prev) =>
        prev.map((session) => (session.id === updated.id ? updated : session)),
      );
      return updated;
    };

    const getSession = (id: string) =>
      sessions.find((session) => session.id === id);

    return { sessions, loaded, createSession, addEvaluation, getSession };
  }, [sessions, loaded]);

  return (
    <EvaluationContext.Provider value={value}>
      {children}
    </EvaluationContext.Provider>
  );
}

export function useEvaluation() {
  const ctx = useContext(EvaluationContext);
  if (!ctx) {
    throw new Error("useEvaluation must be used within an EvaluationProvider");
  }
  return ctx;
}
