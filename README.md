# REMYN

Sistema pessoal de aprendizagem adaptativa. Não é um clone do Anki: repetição espaçada (FSRS) é
só uma das ferramentas internas. O sistema mantém um modelo do que você sabe (níveis 0 a 6),
separa retenção de competência, trata "não testado" como diferente de "não sabe" e explica toda
estimativa com evidências.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3777
```

Os dados ficam em `data/remyn.db` (SQLite local, criado no primeiro boot). A geração de cartões
por IA usa a API da Anthropic: cole sua chave em Ajustes (ou exporte `ANTHROPIC_API_KEY`).

## O que já existe (MVP 1)

- Áreas, conceitos (com prioridade) e cartões (pergunta, cloze, produção)
- Sessão de revisão com FSRS (ts-fsrs), atalhos de teclado e interleaving de áreas nos novos
- Learner model: evidências por conceito, nível de domínio (0 a 6), retenção estimada, confiança,
  estado "sem evidência suficiente" e o "por quê?" de cada estimativa
- Controle de carga: limites diários, pausa automática de novos em overload, projeção de 14 dias
- Geração de cartões por IA com filtro de qualidade (a IA reprova e explica o que não vale cartão)
- Histórico, exportação completa em JSON, apagar histórico

## Arquitetura

- Next.js (App Router) + TypeScript, single-user local (auth fica pra quando virar multiusuário)
- `src/lib/db.ts` SQLite + schema · `src/lib/scheduler.ts` FSRS · `src/lib/learner.ts` evidências
  e competência · `src/lib/queries.ts` repositório, fila e carga · `src/lib/ai/` provider abstraído
  (trocar de fornecedor = implementar a interface `AIProvider`)
- O schema já carrega as fundações dos MVPs 2 a 4: `evidence.kind` aberto (open_question, exercise,
  project, transfer), `concept_links` (pré-requisito, relacionado, confundível), prioridades e
  `ai_log`.

## Roadmap (do prompt mestre)

MVP 2: perguntas abertas avaliadas por IA, exercícios, níveis testados acima de "Lembra",
classificação de erros, knowledge graph navegável. MVP 3: projetos, AI tutor que conhece o learner
model, ingestão de PDFs, transferência, engine de intervenção adaptativa. MVP 4: modelo
probabilístico mais fino e recomendações.
