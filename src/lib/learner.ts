import { db } from "./db";
import { retrievability } from "./scheduler";
import { LEVEL_LABEL } from "./types";

// Meia-vida da relevância de uma evidência: 45 dias. Evidência velha ainda
// conta, mas cada vez menos; o modelo prefere o que você mostrou recentemente.
const DECAY_DAYS = 45;
// Peso mínimo acumulado num nível pra sustentá-lo, e taxa mínima de acerto.
const MIN_WEIGHT = 1.5;
const MIN_RATIO = 0.65;
// Abaixo disso o conceito é "sem evidência suficiente" (unknown), que é
// diferente de "não sabe".
const MIN_EVIDENCE = 3;

interface EvidenceRow {
  kind: string;
  level: number;
  success: number;
  weight: number;
  detail: string;
  created_at: string;
}

function recencyWeight(createdAt: string, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - new Date(createdAt + "Z").getTime()) / 86400000);
  return Math.exp((-Math.LN2 * ageDays) / DECAY_DAYS);
}

export function recordEvidence(opts: {
  conceptId: number;
  kind: string;
  level: number;
  success: number;
  weight?: number;
  detail?: string;
  refId?: number;
}): void {
  db.prepare(
    `INSERT INTO evidence (concept_id, kind, level, success, weight, detail, ref_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    opts.conceptId,
    opts.kind,
    opts.level,
    opts.success,
    opts.weight ?? 1,
    opts.detail ?? "",
    opts.refId ?? null
  );
}

// Recalcula o estado de competência de um conceito a partir das evidências
// e da retrievability FSRS dos cartões dele.
export function recomputeCompetency(conceptId: number): void {
  const now = new Date();
  const evidences = db
    .prepare("SELECT kind, level, success, weight, detail, created_at FROM evidence WHERE concept_id = ?")
    .all(conceptId) as EvidenceRow[];

  // Nível: o maior L cuja evidência em nível >= L sustenta domínio.
  // Evidência de nível alto conta pros níveis abaixo (quem aplica, lembra).
  let level = 0;
  if (evidences.length > 0) {
    level = 1; // houve contato real com o conceito
    for (let l = 2; l <= 6; l++) {
      const at = evidences.filter((e) => e.level >= l);
      const wSum = at.reduce((s, e) => s + e.weight * recencyWeight(e.created_at, now), 0);
      const hit = at.reduce((s, e) => s + e.success * e.weight * recencyWeight(e.created_at, now), 0);
      if (wSum >= MIN_WEIGHT && hit / wSum >= MIN_RATIO) level = l;
      else break;
    }
  }

  const scheds = db
    .prepare(
      `SELECT s.fsrs_json FROM scheduling s
       JOIN cards c ON c.id = s.card_id
       WHERE c.concept_id = ? AND c.suspended = 0`
    )
    .all(conceptId) as { fsrs_json: string }[];
  const rs = scheds
    .map((s) => retrievability(s.fsrs_json, now))
    .filter((r): r is number => r !== null);
  const retention = rs.length > 0 ? rs.reduce((a, b) => a + b, 0) / rs.length : null;

  const totalWeight = evidences.reduce(
    (s, e) => s + e.weight * recencyWeight(e.created_at, now),
    0
  );
  const confidence = 1 - Math.exp(-totalWeight / 4);
  const unknown = evidences.length < MIN_EVIDENCE ? 1 : 0;

  db.prepare(
    `INSERT INTO competency (concept_id, level, retention, confidence, evidence_count, unknown, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(concept_id) DO UPDATE SET
       level = excluded.level, retention = excluded.retention,
       confidence = excluded.confidence, evidence_count = excluded.evidence_count,
       unknown = excluded.unknown, updated_at = excluded.updated_at`
  ).run(conceptId, level, retention, confidence, evidences.length, unknown);
}

// Responde "por quê?" pra qualquer estimativa: frases em PT apontando as
// evidências que sustentam (ou não) o número mostrado.
export function explainCompetency(conceptId: number): string {
  const evidences = db
    .prepare(
      "SELECT kind, level, success, weight, detail, created_at FROM evidence WHERE concept_id = ? ORDER BY created_at DESC"
    )
    .all(conceptId) as EvidenceRow[];

  if (evidences.length === 0) {
    return "Ainda não há nenhuma evidência sobre esse conceito. Sem evidência não significa que você não sabe: significa que o sistema ainda não testou.";
  }

  const total = evidences.length;
  const hits = evidences.filter((e) => e.success >= 0.75).length;
  const partial = evidences.filter((e) => e.success >= 0.4 && e.success < 0.75).length;
  const maxLevel = Math.max(...evidences.map((e) => e.level));
  const recent = evidences.slice(0, 8);
  const recentMiss = recent.filter((e) => e.success < 0.4).length;

  const parts: string[] = [];
  parts.push(
    `Base: ${total} evidência${total > 1 ? "s" : ""} (${hits} acerto${hits === 1 ? "" : "s"}, ${partial} parcial${partial === 1 ? "" : "is"}, ${total - hits - partial} erro${total - hits - partial === 1 ? "" : "s"}).`
  );
  parts.push(
    `A evidência mais exigente até agora foi de nível ${maxLevel} (${LEVEL_LABEL[maxLevel].toLowerCase()}).`
  );
  if (maxLevel <= 2) {
    parts.push(
      "Tudo veio de cartões de recuperação. Isso mostra memória, mas ainda não mostra que você explica ou aplica o conceito; esses testes chegam nas próximas fases."
    );
  }
  if (recentMiss >= 2) {
    parts.push(`Nas últimas ${recent.length} tentativas houve ${recentMiss} erros, o que derrubou a estimativa recente.`);
  }
  if (total < MIN_EVIDENCE) {
    parts.push("Ainda é pouca evidência, então a confiança da estimativa é baixa.");
  }
  return parts.join(" ");
}
