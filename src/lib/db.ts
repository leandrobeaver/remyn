import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS concepts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- MVP 2+: pré-requisito, relacionado, confundível. A tabela já existe pra
-- o learner model poder apontar lacunas de pré-requisito no futuro.
CREATE TABLE IF NOT EXISTS concept_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_concept INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_concept INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('prerequisite','related','confusable'))
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'basic',
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Estado FSRS por cartão. fsrs_json guarda o Card completo do ts-fsrs
-- (robusto a campos novos); due/state duplicados como colunas pra consulta.
CREATE TABLE IF NOT EXISTS scheduling (
  card_id INTEGER PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  due TEXT NOT NULL,
  state INTEGER NOT NULL DEFAULT 0,
  stability REAL NOT NULL DEFAULT 0,
  fsrs_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL,
  state_before INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  due_after TEXT NOT NULL,
  stability_after REAL NOT NULL DEFAULT 0,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Toda estimativa sobre o usuário aponta pra cá. kind: review, open_question,
-- exercise, project, transfer (os últimos entram nos MVPs 2 e 3).
CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  level INTEGER NOT NULL,
  success REAL NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  detail TEXT NOT NULL DEFAULT '',
  ref_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS competency (
  concept_id INTEGER PRIMARY KEY REFERENCES concepts(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  retention REAL,
  confidence REAL NOT NULL DEFAULT 0,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  unknown INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  model TEXT NOT NULL,
  input_chars INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sched_due ON scheduling (state, due);
CREATE INDEX IF NOT EXISTS idx_reviews_at ON reviews (reviewed_at);
CREATE INDEX IF NOT EXISTS idx_evidence_concept ON evidence (concept_id, created_at);
`;

function open(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "remyn.db"));
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

const g = globalThis as unknown as { __remynDb?: Database.Database };
export const db: Database.Database = g.__remynDb ?? (g.__remynDb = open());

export function getSetting(key: string, fallback = ""): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
