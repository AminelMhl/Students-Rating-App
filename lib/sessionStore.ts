import { Pool } from "pg";

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

const connectionString =
  (typeof process !== "undefined" && process.env.POSTGRES_URL) ||
  (typeof process !== "undefined" && process.env.DATABASE_URL) ||
  "";

const postgresEnabled = typeof process !== "undefined" && !!connectionString;

const pool = postgresEnabled ? new Pool({ connectionString }) : null;

const memorySessions = new Map<string, Session>();

const SESSION_ID_PREFIX = "session";
const EVALUATION_ID_PREFIX = "eval";

function generateId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${random}`;
}

let schemaInitialized = false;

async function ensureSchema() {
  if (!postgresEnabled || schemaInitialized === true) return;
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      presenter TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      evaluator TEXT NOT NULL,
      ratings JSONB NOT NULL,
      overall_score REAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  schemaInitialized = true;
}

export async function listSessions(): Promise<Session[]> {
  if (!postgresEnabled) {
    return [...memorySessions.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
  }

  await ensureSchema();
  if (!pool) return [];

  const { rows: sessionRows } = await pool.query<{
    id: string;
    presenter: string;
    created_by: string;
    created_at: Date;
  }>(
    `
    SELECT id, presenter, created_by, created_at
    FROM sessions
    ORDER BY created_at DESC
  `,
  );

  if (!sessionRows.length) return [];

  const sessions = await Promise.all(
    sessionRows.map((row) => getSession(row.id)),
  );

  return sessions.filter(Boolean) as Session[];
}

export async function getSession(id: string): Promise<Session | null> {
  if (!postgresEnabled) {
    return memorySessions.get(id) ?? null;
  }

  await ensureSchema();
  if (!pool) return null;

  const { rows: sessionRows } = await pool.query<{
    id: string;
    presenter: string;
    created_by: string;
    created_at: Date;
  }>(
    `
    SELECT id, presenter, created_by, created_at
    FROM sessions
    WHERE id = $1
    LIMIT 1
  `,
    [id],
  );

  const sessionRow = sessionRows[0];
  if (!sessionRow) return null;

  const { rows: evaluationRows } = await pool.query<{
    id: string;
    evaluator: string;
    ratings: unknown;
    overall_score: number;
    created_at: Date;
  }>(
    `
    SELECT id, evaluator, ratings, overall_score, created_at
    FROM evaluations
    WHERE session_id = $1
    ORDER BY created_at ASC
  `,
    [id],
  );

  const evaluations: Evaluation[] = evaluationRows.map((row) => ({
    id: row.id,
    evaluator: row.evaluator,
    ratings: row.ratings as Record<CriterionId, number>,
    overallScore: row.overall_score,
    createdAt: row.created_at.toISOString(),
  }));

  const session: Session = {
    id: sessionRow.id,
    presenter: sessionRow.presenter,
    createdBy: sessionRow.created_by,
    createdAt: sessionRow.created_at.toISOString(),
    evaluations,
  };

  return session;
}

export async function createSession(
  presenter: string,
  createdBy: string,
): Promise<Session> {
  const nowIso = new Date().toISOString();
  const id = generateId(SESSION_ID_PREFIX);

  if (!postgresEnabled) {
    const session: Session = {
      id,
      presenter: presenter.trim(),
      createdBy: createdBy.trim(),
      createdAt: nowIso,
      evaluations: [],
    };
    memorySessions.set(id, session);
    return session;
  }

  await ensureSchema();
  if (!pool) {
    throw new Error("Postgres pool not available");
  }

  await pool.query(
    `
    INSERT INTO sessions (id, presenter, created_by, created_at)
    VALUES ($1, $2, $3, $4::timestamptz)
  `,
    [id, presenter.trim(), createdBy.trim(), nowIso],
  );

  const session = await getSession(id);
  if (!session) {
    throw new Error("Failed to load session after creation");
  }

  return session;
}

export async function addEvaluationToSession(
  sessionId: string,
  evaluator: string,
  ratings: Record<CriterionId, number>,
  overallScore: number,
): Promise<Session | null> {
  if (!postgresEnabled) {
    const existing = memorySessions.get(sessionId);
    if (!existing) return null;

    const nowIso = new Date().toISOString();
    const evaluation: Evaluation = {
      id: generateId(EVALUATION_ID_PREFIX),
      evaluator: evaluator.trim(),
      ratings,
      overallScore,
      createdAt: nowIso,
    };

    const updated: Session = {
      ...existing,
      evaluations: [...existing.evaluations, evaluation],
    };

    memorySessions.set(sessionId, updated);
    return updated;
  }

  await ensureSchema();
  if (!pool) return null;

  const existing = await getSession(sessionId);
  if (!existing) return null;

  const nowIso = new Date().toISOString();
  const evaluationId = generateId(EVALUATION_ID_PREFIX);

  await pool.query(
    `
    INSERT INTO evaluations (
      id,
      session_id,
      evaluator,
      ratings,
      overall_score,
      created_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4::jsonb,
      $5,
      $6::timestamptz
    )
  `,
    [
      evaluationId,
      sessionId,
      evaluator.trim(),
      JSON.stringify(ratings),
      overallScore,
      nowIso,
    ],
  );

  const updated = await getSession(sessionId);
  return updated;
}

export async function deleteSession(id: string): Promise<boolean> {
  if (!postgresEnabled) {
    return memorySessions.delete(id);
  }

  await ensureSchema();
  if (!pool) return false;

  await pool.query(
    `
    DELETE FROM sessions
    WHERE id = $1
  `,
    [id],
  );

  return true;
}
