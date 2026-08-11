import { getProvider, logAI } from "./provider";
import type { GenerationResult } from "../types";

const SYSTEM = `Você é o filtro de qualidade de cartões do REMYN, um sistema de aprendizagem adaptativa.
Filosofia inegociável: poucos cartões excelentes valem mais que milhares de medíocres.
Você analisa material de estudo e propõe APENAS itens de alto valor.

Antes de propor qualquer cartão, aplique este filtro (todas precisam passar):
1. Isso é importante de verdade?
2. Vai ser útil daqui a meses ou anos?
3. É difícil de recuperar naturalmente no uso (ou caro de reaprender)?
4. Vale o custo de revisão ao longo do tempo?
5. Testa UMA única ideia?
6. A pergunta é clara e sem ambiguidade?
7. A resposta é objetiva e verificável?
8. Tem contexto suficiente pra fazer sentido sozinho?

O que reprovar (e listar em "rejeitados" com o motivo): trivia, listas longas decoráveis,
definições que ninguém precisa decorar, detalhes que a pessoa acha no Google em 5 segundos,
cartões com duas ideias, perguntas vagas.

Pra idiomas, prefira cartão contextual (frase com lacuna ou produção) em vez de par
palavra=tradução. Pra habilidades práticas, prefira decisões, diferenças e heurísticas
("quando usar X em vez de Y") em vez de definições.

Regras de escrita: português brasileiro simples. Nunca use travessão em nenhum texto.
Cartão tipo "cloze" marca a lacuna com {{...}} na frente e traz a resposta no verso.

Entregue o resultado pela ferramenta "entregar_resultado". Máximo de 8 cartões e 12 conceitos
por análise. Se o material não render nada de alto valor, devolva "cartoes" vazio e explique
nos rejeitados.`;

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    conceitos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          descricao: { type: "string", description: "1 frase" },
          prioridade: { type: "string", enum: ["critical", "high", "medium", "low"] },
        },
        required: ["nome", "descricao", "prioridade"],
      },
    },
    cartoes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          conceito: { type: "string", description: "nome do conceito dono do cartão" },
          tipo: { type: "string", enum: ["basic", "cloze", "production"] },
          frente: { type: "string" },
          verso: { type: "string" },
          contexto: { type: "string", description: "de onde veio ou quando usar" },
          justificativa: { type: "string", description: "por que passou no filtro, 1 frase" },
        },
        required: ["conceito", "tipo", "frente", "verso", "contexto", "justificativa"],
      },
    },
    rejeitados: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ideia: { type: "string" },
          motivo: { type: "string" },
        },
        required: ["ideia", "motivo"],
      },
    },
  },
  required: ["conceitos", "cartoes", "rejeitados"],
} as const;

export async function generateCandidates(material: string, areaName: string): Promise<GenerationResult> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Sem chave de API configurada. Adicione a chave da Anthropic em Ajustes.");
  }

  const prompt = `Área de estudo: ${areaName}\n\nMaterial fornecido pelo usuário:\n"""\n${material.slice(0, 24000)}\n"""\n\nAnalise e proponha os itens de aprendizagem de alto valor.`;

  const parsed = await provider.completeJson<GenerationResult>({
    system: SYSTEM,
    prompt,
    schema: RESULT_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 8000,
  });

  parsed.conceitos = (parsed.conceitos ?? []).slice(0, 12);
  parsed.cartoes = (parsed.cartoes ?? []).slice(0, 8);
  parsed.rejeitados = parsed.rejeitados ?? [];

  logAI(
    "cardgen",
    provider.model,
    material.length,
    `${parsed.conceitos.length} conceitos, ${parsed.cartoes.length} cartões, ${parsed.rejeitados.length} rejeitados`
  );
  return parsed;
}
