import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";
import { getSetting } from "./db";

// A meta de retenção controla o trade-off central do produto: menos revisões
// sem deixar a memória cair. 0.90 é o padrão; ajustável em Ajustes.
function engine() {
  const target = parseFloat(getSetting("request_retention", "0.9"));
  return fsrs(
    generatorParameters({
      request_retention: isNaN(target) ? 0.9 : Math.min(0.97, Math.max(0.75, target)),
      enable_fuzz: true,
    })
  );
}

export function newCardJson(now = new Date()): string {
  return JSON.stringify(createEmptyCard(now));
}

function revive(json: string): FsrsCard {
  const c = JSON.parse(json) as FsrsCard;
  c.due = new Date(c.due);
  if (c.last_review) c.last_review = new Date(c.last_review);
  return c;
}

export interface GradeResult {
  json: string;
  due: Date;
  state: number;
  stability: number;
}

export function applyGrade(json: string, rating: 1 | 2 | 3 | 4, now = new Date()): GradeResult {
  const card = revive(json);
  const { card: next } = engine().next(card, now, rating as Grade);
  return {
    json: JSON.stringify(next),
    due: next.due,
    state: next.state,
    stability: next.stability,
  };
}

// Probabilidade de lembrar agora (null pra cartão nunca revisado).
export function retrievability(json: string, now = new Date()): number | null {
  const card = revive(json);
  if (card.state === State.New) return null;
  const r = engine().get_retrievability(card, now, false);
  return typeof r === "number" && isFinite(r) ? Math.max(0, Math.min(1, r)) : null;
}

export { Rating, State };
