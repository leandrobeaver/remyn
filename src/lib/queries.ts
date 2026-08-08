import { db, getSetting } from "./db";
import { applyGrade, newCardJson } from "./scheduler";
import { recordEvidence, recomputeCompetency } from "./learner";
import {
  PRIORITY_WEIGHT,
  type Area,
  type Card,
  type CardType,
  type Competency,
  type Concept,
  type Priority,
  type QueueItem,
} from "./types";

// ---------- áreas / conceitos / cartões ----------

export function listAreas(): (Area & { concepts: number; cards: number })[] {
  return db
    .prepare(
      `SELECT a.*,
        (SELECT COUNT(*) FROM concepts c WHERE c.area_id = a.id) AS concepts,
        (SELECT COUNT(*) FROM cards k JOIN concepts c ON c.id = k.concept_id WHERE c.area_id = a.id) AS cards
       FROM areas a ORDER BY a.id`
    )
    .all() as (Area & { concepts: number; cards: number })[];
}

export function getArea(id: number): Area | undefined {
  return db.prepare("SELECT * FROM areas WHERE id = ?").get(id) as Area | undefined;
}

export function createArea(name: string, description: string): number {
  const r = db.prepare("INSERT INTO areas (name, description) VALUES (?, ?)").run(name, description);
  return Number(r.lastInsertRowid);
}

export function listConcepts(areaId: number): (Concept & { competency: Competency | null; cardCount: number })[] {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM cards k WHERE k.concept_id = c.id AND k.suspended = 0) AS cardCount
       FROM concepts c WHERE c.area_id = ? ORDER BY c.id`
    )
    .all(areaId) as (Concept & { cardCount: number })[];
  const comp = db.prepare("SELECT * FROM competency WHERE concept_id = ?");
  return rows.map((c) => ({ ...c, competency: (comp.get(c.id) as Competency | undefined) ?? null }));
}

export function createConcept(areaId: number, name: string, description: string, priority: Priority): number {
  const r = db
    .prepare("INSERT INTO concepts (area_id, name, description, priority) VALUES (?, ?, ?, ?)")
    .run(areaId, name, description, priority);
  const id = Number(r.lastInsertRowid);
  recomputeCompetency(id);
  return id;
}

export function findOrCreateConcept(areaId: number, name: string, description = "", priority: Priority = "medium"): number {
  const row = db
    .prepare("SELECT id FROM concepts WHERE area_id = ? AND LOWER(name) = LOWER(?)")
    .get(areaId, name) as { id: number } | undefined;
  if (row) return row.id;
  return createConcept(areaId, name, description, priority);
}

export function listCards(conceptId: number): Card[] {
  return db.prepare("SELECT * FROM cards WHERE concept_id = ? ORDER BY id").all(conceptId) as Card[];
}

export function createCard(opts: {
  conceptId: number;
  type: CardType;
  front: string;
  back: string;
  context?: string;
  source?: "manual" | "ai";
}): number {
  const r = db
    .prepare("INSERT INTO cards (concept_id, type, front, back, context, source) VALUES (?, ?, ?, ?, ?, ?)")
    .run(opts.conceptId, opts.type, opts.front, opts.back, opts.context ?? "", opts.source ?? "manual");
  const id = Number(r.lastInsertRowid);
  const json = newCardJson();
  const due = (JSON.parse(json) as { due: string }).due;
  db.prepare("INSERT INTO scheduling (card_id, due, state, stability, fsrs_json) VALUES (?, ?, 0, 0, ?)").run(
    id,
    due,
    json
  );
  return id;
}

export function deleteCard(cardId: number): void {
  db.prepare("DELETE FROM cards WHERE id = ?").run(cardId);
}

export function toggleSuspend(cardId: number): void {
  db.prepare("UPDATE cards SET suspended = 1 - suspended WHERE id = ?").run(cardId);
}

// ---------- carga diária e fila ----------

export interface DailyPlan {
  dueNow: number;
  backlog: number;
  newAvailable: number;
  newAllowed: number;
  reviewLimit: number;
  estimatedMinutes: number;
  overloaded: boolean;
  projection: { day: string; count: number }[];
}

// Controle de overload: se o vencido do dia já passa do limite, novos cartões
// são pausados. O objetivo declarado do produto: nunca deixar montar review hell.
export function getDailyPlan(now = new Date()): DailyPlan {
  const nowIso = now.toISOString();
  const newLimit = parseInt(getSetting("daily_new_limit", "6"), 10);
  const reviewLimit = parseInt(getSetting("daily_review_limit", "60"), 10);

  const dueNow = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM scheduling s JOIN cards c ON c.id = s.card_id
         WHERE c.suspended = 0 AND s.state != 0 AND s.due <= ?`
      )
      .get(nowIso) as { n: number }
  ).n;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const backlog = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM scheduling s JOIN cards c ON c.id = s.card_id
         WHERE c.suspended = 0 AND s.state != 0 AND s.due < ?`
      )
      .get(startOfDay.toISOString()) as { n: number }
  ).n;

  const newAvailable = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM scheduling s JOIN cards c ON c.id = s.card_id
         WHERE c.suspended = 0 AND s.state = 0`
      )
      .get() as { n: number }
  ).n;

  const newToday = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM reviews r
         WHERE r.state_before = 0 AND r.reviewed_at >= ?`
      )
      .get(startOfDay.toISOString().replace("T", " ").slice(0, 19)) as { n: number }
  ).n;

  const overloaded = dueNow > reviewLimit;
  const newAllowed = overloaded ? 0 : Math.max(0, Math.min(newLimit - newToday, newAvailable));

  const avgMs = (
    db.prepare("SELECT AVG(elapsed_ms) AS a FROM reviews WHERE elapsed_ms > 0").get() as { a: number | null }
  ).a;
  const perCard = avgMs && avgMs > 500 ? avgMs : 11000;
  const estimatedMinutes = Math.max(1, Math.round(((Math.min(dueNow, reviewLimit) + newAllowed) * perCard) / 60000));

  const projection: { day: string; count: number }[] = [];
  for (let d = 0; d < 14; d++) {
    const a = new Date(startOfDay);
    a.setDate(a.getDate() + d);
    const b = new Date(startOfDay);
    b.setDate(b.getDate() + d + 1);
    const n = (
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM scheduling s JOIN cards c ON c.id = s.card_id
           WHERE c.suspended = 0 AND s.state != 0 AND s.due >= ? AND s.due < ?`
        )
        .get(d === 0 ? "1970-01-01" : a.toISOString(), b.toISOString()) as { n: number }
    ).n;
    projection.push({ day: a.toISOString().slice(0, 10), count: n });
  }

  return { dueNow, backlog, newAvailable, newAllowed, reviewLimit, estimatedMinutes, overloaded, projection };
}

// Fila da sessão: vencidos primeiro (prioridade do conceito × atraso), depois
// novos intercalados por área (interleaving básico: nunca um bloco só de uma área).
export function getReviewQueue(now = new Date()): QueueItem[] {
  const plan = getDailyPlan(now);
  const due = db
    .prepare(
      `SELECT c.*, s.due AS s_due, s.state AS s_state, co.id AS co_id
       FROM scheduling s
       JOIN cards c ON c.id = s.card_id
       JOIN concepts co ON co.id = c.concept_id
       WHERE c.suspended = 0 AND s.state != 0 AND s.due <= ?
       ORDER BY s.due ASC
       LIMIT ?`
    )
    .all(now.toISOString(), plan.reviewLimit) as (Card & { s_due: string; s_state: number })[];

  const news = db
    .prepare(
      `SELECT c.* FROM scheduling s
       JOIN cards c ON c.id = s.card_id
       WHERE c.suspended = 0 AND s.state = 0
       ORDER BY c.id ASC
       LIMIT ?`
    )
    .all(Math.max(plan.newAllowed * 3, plan.newAllowed)) as Card[];

  const conceptStmt = db.prepare("SELECT * FROM concepts WHERE id = ?");
  const areaStmt = db.prepare("SELECT * FROM areas WHERE id = ?");
  const hydrate = (card: Card, isNew: boolean): QueueItem => {
    const concept = conceptStmt.get(card.concept_id) as Concept;
    const area = areaStmt.get(concept.area_id) as Area;
    return { card, concept, area, isNew };
  };

  const dueItems = due
    .map((c) => hydrate(c, false))
    .sort((x, y) => {
      const px = PRIORITY_WEIGHT[x.concept.priority] ?? 2;
      const py = PRIORITY_WEIGHT[y.concept.priority] ?? 2;
      return py - px;
    });

  // round-robin de áreas nos novos
  const byArea = new Map<number, QueueItem[]>();
  for (const c of news) {
    const item = hydrate(c, true);
    const list = byArea.get(item.area.id) ?? [];
    list.push(item);
    byArea.set(item.area.id, list);
  }
  const newItems: QueueItem[] = [];
  const buckets = [...byArea.values()];
  let added = true;
  while (added && newItems.length < plan.newAllowed) {
    added = false;
    for (const bucket of buckets) {
      const next = bucket.shift();
      if (next && newItems.length < plan.newAllowed) {
        newItems.push(next);
        added = true;
      }
    }
  }

  return [...dueItems, ...newItems];
}

// ---------- revisão (transação completa) ----------

export interface GradeOutcome {
  dueText: string;
  state: number;
}

const gradeTx = db.transaction(
  (cardId: number, rating: 1 | 2 | 3 | 4, elapsedMs: number, sessionId: number | null): GradeOutcome => {
    const sched = db.prepare("SELECT * FROM scheduling WHERE card_id = ?").get(cardId) as
      | { fsrs_json: string; state: number }
      | undefined;
    if (!sched) throw new Error("Cartão sem agendamento");
    const card = db.prepare("SELECT * FROM cards WHERE id = ?").get(cardId) as Card;

    const now = new Date();
    const result = applyGrade(sched.fsrs_json, rating, now);
    db.prepare("UPDATE scheduling SET due = ?, state = ?, stability = ?, fsrs_json = ? WHERE card_id = ?").run(
      result.due.toISOString(),
      result.state,
      result.stability,
      result.json,
      cardId
    );

    const rv = db
      .prepare(
        `INSERT INTO reviews (card_id, session_id, rating, state_before, elapsed_ms, due_after, stability_after)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(cardId, sessionId, rating, sched.state, elapsedMs, result.due.toISOString(), result.stability);

    // Evidência: cartão testa no máximo nível 2 (lembrança). Acertar cartão
    // nunca vira prova de aplicação; isso fica registrado no próprio dado.
    const success = rating === 1 ? 0 : rating === 2 ? 0.6 : 1;
    recordEvidence({
      conceptId: card.concept_id,
      kind: "review",
      level: 2,
      success,
      weight: 1,
      detail: `Cartão ${cardId}, nota ${rating}`,
      refId: Number(rv.lastInsertRowid),
    });
    recomputeCompetency(card.concept_id);

    if (sessionId) {
      db.prepare(
        "UPDATE sessions SET review_count = review_count + 1, correct_count = correct_count + ? WHERE id = ?"
      ).run(rating >= 3 ? 1 : 0, sessionId);
    }

    const days = Math.round((result.due.getTime() - now.getTime()) / 86400000);
    const mins = Math.round((result.due.getTime() - now.getTime()) / 60000);
    const dueText = days >= 30 ? `volta em ${Math.round(days / 30)} m${Math.round(days / 30) > 1 ? "eses" : "ês"}` : days >= 1 ? `volta em ${days} d` : mins >= 60 ? `volta em ${Math.round(mins / 60)} h` : `volta em ${Math.max(1, mins)} min`;
    return { dueText, state: result.state };
  }
);

export function gradeCard(cardId: number, rating: 1 | 2 | 3 | 4, elapsedMs: number, sessionId: number | null): GradeOutcome {
  return gradeTx(cardId, rating, elapsedMs, sessionId);
}

export function startSession(): number {
  const r = db.prepare("INSERT INTO sessions DEFAULT VALUES").run();
  return Number(r.lastInsertRowid);
}

export function endSession(id: number): void {
  db.prepare("UPDATE sessions SET ended_at = datetime('now') WHERE id = ?").run(id);
}

// ---------- dashboard ----------

export interface AreaSummary {
  area: Area;
  conceptCount: number;
  testedCount: number;
  unknownCount: number;
  avgRetention: number | null;
  avgLevel: number;
}

export function dashboardAreas(): AreaSummary[] {
  const areas = listAreas();
  return areas.map((area) => {
    const comps = db
      .prepare(
        `SELECT k.* FROM competency k JOIN concepts c ON c.id = k.concept_id WHERE c.area_id = ?`
      )
      .all(area.id) as Competency[];
    const tested = comps.filter((k) => !k.unknown);
    const withRet = comps.filter((k) => k.retention !== null);
    return {
      area,
      conceptCount: area.concepts,
      testedCount: tested.length,
      unknownCount: area.concepts - tested.length,
      avgRetention:
        withRet.length > 0 ? withRet.reduce((s, k) => s + (k.retention ?? 0), 0) / withRet.length : null,
      avgLevel: tested.length > 0 ? tested.reduce((s, k) => s + k.level, 0) / tested.length : 0,
    };
  });
}

export interface FragileConcept {
  concept: Concept;
  area: Area;
  competency: Competency;
  score: number;
}

export function fragileConcepts(limit = 5): FragileConcept[] {
  const rows = db
    .prepare(
      `SELECT c.id FROM concepts c JOIN competency k ON k.concept_id = c.id
       WHERE k.unknown = 0 AND k.retention IS NOT NULL`
    )
    .all() as { id: number }[];
  const conceptStmt = db.prepare("SELECT * FROM concepts WHERE id = ?");
  const areaStmt = db.prepare("SELECT * FROM areas WHERE id = ?");
  const compStmt = db.prepare("SELECT * FROM competency WHERE concept_id = ?");
  return rows
    .map((r) => {
      const concept = conceptStmt.get(r.id) as Concept;
      const competency = compStmt.get(r.id) as Competency;
      const area = areaStmt.get(concept.area_id) as Area;
      const risk = 1 - (competency.retention ?? 1);
      return { concept, area, competency, score: risk * (PRIORITY_WEIGHT[concept.priority] ?? 2) };
    })
    .filter((f) => f.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------- histórico ----------

export interface DayStat {
  day: string;
  count: number;
  correct: number;
}

export function reviewsByDay(days = 30): DayStat[] {
  const rows = db
    .prepare(
      `SELECT date(reviewed_at) AS day, COUNT(*) AS count, SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) AS correct
       FROM reviews WHERE reviewed_at >= date('now', ?)
       GROUP BY date(reviewed_at) ORDER BY day`
    )
    .all(`-${days} days`) as DayStat[];
  return rows;
}

export function recentSessions(limit = 15) {
  return db
    .prepare("SELECT * FROM sessions WHERE review_count > 0 ORDER BY id DESC LIMIT ?")
    .all(limit) as { id: number; started_at: string; ended_at: string | null; review_count: number; correct_count: number }[];
}

export function totals() {
  const t = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM reviews) AS reviews,
              (SELECT COUNT(*) FROM cards WHERE suspended = 0) AS cards,
              (SELECT COUNT(*) FROM concepts) AS concepts,
              (SELECT COALESCE(SUM(elapsed_ms), 0) FROM reviews) AS timeMs`
    )
    .get() as { reviews: number; cards: number; concepts: number; timeMs: number };
  return t;
}

// ---------- privacidade ----------

export function exportAll() {
  const tables = ["areas", "concepts", "concept_links", "cards", "scheduling", "sessions", "reviews", "evidence", "competency", "settings"];
  const dump: Record<string, unknown[]> = {};
  for (const t of tables) dump[t] = db.prepare(`SELECT * FROM ${t}`).all();
  return { exported_at: new Date().toISOString(), app: "remyn", version: 1, data: dump };
}

export function wipeHistory(): void {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM reviews").run();
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM evidence").run();
    db.prepare("DELETE FROM competency").run();
    const cards = db.prepare("SELECT card_id FROM scheduling").all() as { card_id: number }[];
    const upd = db.prepare("UPDATE scheduling SET due = ?, state = 0, stability = 0, fsrs_json = ? WHERE card_id = ?");
    for (const c of cards) {
      const json = newCardJson();
      upd.run((JSON.parse(json) as { due: string }).due, json, c.card_id);
    }
    const concepts = db.prepare("SELECT id FROM concepts").all() as { id: number }[];
    for (const c of concepts) recomputeCompetency(c.id);
  });
  tx();
}
