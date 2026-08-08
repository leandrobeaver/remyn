export type Priority = "critical" | "high" | "medium" | "low";
export type CardType = "basic" | "cloze" | "production";

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Crítico",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

// Peso usado na ordenação da fila e no ranking de conceitos frágeis.
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  basic: "Pergunta",
  cloze: "Lacuna",
  production: "Produção",
};

// Níveis de domínio (0 a 6). Cartão de revisão só gera evidência até o nível 2:
// acertar cartão nunca prova aplicação nem transferência.
export const LEVEL_LABEL: string[] = [
  "Nunca visto",
  "Reconhece",
  "Lembra",
  "Explica",
  "Aplica",
  "Transfere",
  "Cria e ensina",
];

export interface Area {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Concept {
  id: number;
  area_id: number;
  name: string;
  description: string;
  priority: Priority;
  created_at: string;
}

export interface Card {
  id: number;
  concept_id: number;
  type: CardType;
  front: string;
  back: string;
  context: string;
  source: "manual" | "ai";
  suspended: number;
  created_at: string;
}

export interface Competency {
  concept_id: number;
  level: number;
  retention: number | null;
  confidence: number;
  evidence_count: number;
  unknown: number;
  updated_at: string;
}

export interface QueueItem {
  card: Card;
  concept: Concept;
  area: Area;
  isNew: boolean;
}

export interface CandidateCard {
  conceito: string;
  tipo: CardType;
  frente: string;
  verso: string;
  contexto: string;
  justificativa: string;
}

export interface GenerationResult {
  conceitos: { nome: string; descricao: string; prioridade: Priority }[];
  cartoes: CandidateCard[];
  rejeitados: { ideia: string; motivo: string }[];
}
