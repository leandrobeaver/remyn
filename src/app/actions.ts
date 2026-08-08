"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setSetting } from "@/lib/db";
import { generateCandidates } from "@/lib/ai/cardgen";
import {
  createArea,
  createCard,
  createConcept,
  deleteCard,
  endSession,
  findOrCreateConcept,
  gradeCard,
  startSession,
  toggleSuspend,
  wipeHistory,
  type GradeOutcome,
} from "@/lib/queries";
import type { CandidateCard, CardType, GenerationResult, Priority } from "@/lib/types";

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];
const CARD_TYPES: CardType[] = ["basic", "cloze", "production"];

export async function createAreaAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const id = createArea(name, String(formData.get("description") ?? "").trim());
  revalidatePath("/areas");
  redirect(`/areas/${id}`);
}

export async function createConceptAction(formData: FormData): Promise<void> {
  const areaId = Number(formData.get("area_id"));
  const name = String(formData.get("name") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium") as Priority;
  if (!areaId || !name) return;
  createConcept(areaId, name, String(formData.get("description") ?? "").trim(), PRIORITIES.includes(priority) ? priority : "medium");
  revalidatePath(`/areas/${areaId}`);
}

export async function createCardAction(formData: FormData): Promise<void> {
  const conceptId = Number(formData.get("concept_id"));
  const areaId = Number(formData.get("area_id"));
  const front = String(formData.get("front") ?? "").trim();
  const back = String(formData.get("back") ?? "").trim();
  const type = String(formData.get("type") ?? "basic") as CardType;
  if (!conceptId || !front || !back) return;
  createCard({
    conceptId,
    type: CARD_TYPES.includes(type) ? type : "basic",
    front,
    back,
    context: String(formData.get("context") ?? "").trim(),
  });
  revalidatePath(`/areas/${areaId}`);
  revalidatePath("/");
}

export async function deleteCardAction(cardId: number, areaId: number): Promise<void> {
  deleteCard(cardId);
  revalidatePath(`/areas/${areaId}`);
  revalidatePath("/");
}

export async function toggleSuspendAction(cardId: number, areaId: number): Promise<void> {
  toggleSuspend(cardId);
  revalidatePath(`/areas/${areaId}`);
  revalidatePath("/");
}

export async function startSessionAction(): Promise<number> {
  return startSession();
}

export async function gradeCardAction(
  cardId: number,
  rating: 1 | 2 | 3 | 4,
  elapsedMs: number,
  sessionId: number | null
): Promise<GradeOutcome> {
  return gradeCard(cardId, rating, elapsedMs, sessionId);
}

export async function endSessionAction(sessionId: number): Promise<void> {
  endSession(sessionId);
  revalidatePath("/");
  revalidatePath("/historico");
}

export async function generateCardsAction(
  areaId: number,
  areaName: string,
  material: string
): Promise<{ ok: true; result: GenerationResult } | { ok: false; error: string }> {
  try {
    if (material.trim().length < 40) {
      return { ok: false, error: "Material curto demais pra analisar. Cole um trecho maior." };
    }
    const result = await generateCandidates(material, areaName);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha na geração." };
  }
}

export async function approveCandidatesAction(
  areaId: number,
  approved: CandidateCard[],
  conceptMeta: { nome: string; descricao: string; prioridade: Priority }[]
): Promise<number> {
  let created = 0;
  for (const card of approved.slice(0, 12)) {
    const meta = conceptMeta.find((c) => c.nome.toLowerCase() === card.conceito.toLowerCase());
    const conceptId = findOrCreateConcept(
      areaId,
      card.conceito.slice(0, 120),
      meta?.descricao ?? "",
      meta && PRIORITIES.includes(meta.prioridade) ? meta.prioridade : "medium"
    );
    createCard({
      conceptId,
      type: CARD_TYPES.includes(card.tipo) ? card.tipo : "basic",
      front: card.frente,
      back: card.verso,
      context: card.contexto ?? "",
      source: "ai",
    });
    created++;
  }
  revalidatePath(`/areas/${areaId}`);
  revalidatePath("/");
  return created;
}

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const key = String(formData.get("anthropic_api_key") ?? "");
  if (key.trim()) setSetting("anthropic_api_key", key.trim());
  const model = String(formData.get("ai_model") ?? "").trim();
  if (model) setSetting("ai_model", model);
  const retention = String(formData.get("request_retention") ?? "").trim();
  if (retention) setSetting("request_retention", retention);
  const newLimit = String(formData.get("daily_new_limit") ?? "").trim();
  if (newLimit) setSetting("daily_new_limit", newLimit);
  const reviewLimit = String(formData.get("daily_review_limit") ?? "").trim();
  if (reviewLimit) setSetting("daily_review_limit", reviewLimit);
  revalidatePath("/ajustes");
  revalidatePath("/");
}

export async function wipeHistoryAction(): Promise<void> {
  wipeHistory();
  revalidatePath("/");
  revalidatePath("/historico");
  revalidatePath("/ajustes");
}
