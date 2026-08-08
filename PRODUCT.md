# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Leandro (e depois outros aprendizes autodirigidos): pessoas estudando habilidades reais (programação, idiomas, conhecimento profissional) por conta própria, no desktop de manhã (sessão de 20 a 30 min) e em toques curtos ao longo do dia. O trabalho do usuário: reter o que vale a pena e virar competente de verdade, gastando o mínimo de tempo dentro do app.

## Product Purpose

REMYN é um sistema operacional pessoal de aprendizagem. Combina repetição espaçada (FSRS), recuperação ativa, learner model por conceito e geração adaptativa de exercícios por IA. Sucesso: competência adquirida e retida por unidade de tempo investido. Fracasso explícito: review hell, cassino de streaks, milhares de cartões medíocres.

## Positioning

Diferente do Anki: o cartão é só uma das intervenções. O sistema mantém um modelo do que o usuário sabe (níveis 0 a 6, de "nunca visto" a "cria/ensina"), distingue retenção de competência, trata "não testado" como diferente de "não sabe", e escolhe a intervenção com maior ganho provável naquele momento. Cada estimativa aponta para evidências (explicabilidade).

## Operating Context

Uso local, single-user no MVP (premissa: sem multiusuário/auth real por ora; dados do usuário ficam em SQLite local, exportáveis). Rotina: revisão de manhã, captura leve durante o dia, processamento de 5 a 10 min à noite. IA via API da Anthropic com chave do usuário; sem chave, tudo funciona menos os recursos de IA.

## Capabilities and Constraints

MVP 1 (esta entrega): áreas, conceitos, cartões (básico, cloze, produção), revisão com FSRS, histórico, learner model básico (nível + retenção + confiança + unknown), dashboard de competência, geração de cartões por IA com filtro de qualidade (a IA recusa cartão de baixo valor).
Arquitetura já preparada para MVP 2+: tabelas de evidência, tipos de intervenção, links entre conceitos (pré-requisito, relacionado, confundível), prioridade por item, camada de IA abstraída (provider trocável).
Regras de produto invioláveis: nunca assumir que acerto de cartão = domínio; nunca criar cartões indiscriminadamente; nunca confundir "não testado" com "não sabe"; controle de carga diária.

## Brand Commitments

Nome provisório: REMYN. Sem identidade visual prévia; proibido: gamificação de cassino, métricas de vaidade em destaque (streaks, contagem de cartões como métrica principal). Copy do app em PT-BR, linguagem simples e falada; nunca usar travessão em nenhum texto do produto.

## Evidence on Hand

Nenhum dado real de usuário ainda. Seed de demonstração permitido se rotulado como exemplo. Não inventar: benchmarks, depoimentos, números de eficácia.

## Product Principles

1. Competência não é retenção: medir e mostrar as duas separadamente.
2. Poucos cartões excelentes valem mais que milhares de medíocres; a IA filtra antes de criar.
3. O app vence quando o usuário precisa menos dele: minimizar revisões sem deixar a memória cair.
4. Toda estimativa sobre o usuário deve poder responder "por quê?" com evidências.
5. Erro é dado de alto valor, nunca punição.
