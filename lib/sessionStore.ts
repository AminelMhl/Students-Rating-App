import { kv } from "@vercel/kv";

type CriterionId =
  | "explainability"
  | "clarity"
  | "content"
  | "engagement"
  | "timeManagement"
  | "delivery";

type Evaluation = {
  id: string;
  evaluator: string;
  ratings: Record<CriterionId, number>;
  overallScore: number;
  createdAt: string;
};

export type Session = {
  id: string;
  presenter: string;
  createdBy: string;
  createdAt: string;
  evaluations: Evaluation[];
};

const SESSION_KEY = (id: string) => `session:${id}`;
const SESSION_INDEX_KEY = "session:index";

const kvEnabled =
  typeof process !== "undefined" &&
  !!(process.env.KV_REST_API_URL || process.env.KV_URL);

const memorySessions = new Map<string, Session>();
const memoryIndex: string[] = [];

function generateId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${random}`;
}

export async function listSessions(): Promise<Session[]> {
  if (!kvEnabled) {
    return [...memorySessions.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
  }

  const ids = await kv.zrange<string[]>(SESSION_INDEX_KEY, 0, -1, {
    rev: true,
  });

  if (!ids?.length) return [];

  const sessions = await Promise.all(
    ids.map((id) => kv.get<Session>(SESSION_KEY(id))),
  );

  return sessions.filter(Boolean) as Session[];
}

export async function getSession(id: string): Promise<Session | null> {
  if (!kvEnabled) {
    return memorySessions.get(id) ?? null;
  }

  const session = await kv.get<Session>(SESSION_KEY(id));
  if (!session) return null;
  return session;
}

export async function createSession(
  presenter: string,
  createdBy: string,
): Promise<Session> {
  const now = new Date().toISOString();
  const id = generateId("session");

  const session: Session = {
    id,
    presenter: presenter.trim(),
    createdBy: createdBy.trim(),
    createdAt: now,
    evaluations: [],
  };

  if (!kvEnabled) {
    memorySessions.set(id, session);
    memoryIndex.push(id);
    return session;
  }

  await kv.set(SESSION_KEY(id), session);
  await kv.zadd(SESSION_INDEX_KEY, {
    score: Date.now(),
    member: id,
  });

  return session;
}

export async function addEvaluationToSession(
  sessionId: string,
  evaluator: string,
  ratings: Record<CriterionId, number>,
  overallScore: number,
): Promise<Session | null> {
  const existing = await getSession(sessionId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const evaluation: Evaluation = {
    id: generateId("eval"),
    evaluator: evaluator.trim(),
    ratings,
    overallScore,
    createdAt: now,
  };

  const updated: Session = {
    ...existing,
    evaluations: [...existing.evaluations, evaluation],
  };

  if (!kvEnabled) {
    memorySessions.set(sessionId, updated);
    return updated;
  }

  await kv.set(SESSION_KEY(sessionId), updated);
  return updated;
}
