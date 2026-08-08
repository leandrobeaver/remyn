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

Responda SOMENTE com JSON válido, sem markdown, neste formato exato:
{
  "conceitos": [{"nome": "...", "descricao": "1 frase", "prioridade": "critical|high|medium|low"}],
  "cartoes": [{"conceito": "nome do conceito", "tipo": "basic|cloze|production", "frente": "...", "verso": "...", "contexto": "de onde veio ou quando usar", "justificativa": "por que passou no filtro, 1 frase"}],
  "rejeitados": [{"ideia": "...", "motivo": "..."}]
}
Máximo de 8 cartões e 12 conceitos por análise. Se o material não render nada de alto valor,
devolva "cartoes" vazio e explique nos rejeitados.`;

export async function generateCandidates(material: string, areaName: string): Promise<GenerationResult> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Sem chave de API configurada. Adicione a chave da Anthropic em Ajustes.");
  }

  const prompt = `Área de estudo: ${areaName}\n\nMaterial fornecido pelo usuário:\n"""\n${material.slice(0, 24000)}\n"""\n\nAnalise e proponha os itens de aprendizagem de alto valor.`;

  const raw = await provider.complete({ system: SYSTEM, prompt, maxTokens: 4000 });
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let parsed: GenerationResult;
  try {
    parsed = JSON.parse(cleaned) as GenerationResult;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("A IA não devolveu JSON válido. Tente de novo.");
    parsed = JSON.parse(match[0]) as GenerationResult;
  }

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
