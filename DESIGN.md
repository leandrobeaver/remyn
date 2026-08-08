# DESIGN.md · REMYN

Mundo visual: **caderno didático suíço de matemática, impressão em duas cores**. A interface é uma
apostila de exercícios bem diagramada: grid rígido, numeração como gramática, filetes finos,
tinta preta + uma cor de impressão. Nada de dashboard escuro, gradiente, glassmorphism, anel de
progresso ou card dentro de card.

## Cores (duas tintas sobre papel)

- Papel: `#FBFBF8` (fundo de tudo; não existe "card" com fundo diferente, existe área delimitada por filete)
- Tinta preta: `#17171A` (texto), secundária `#5A5A57`, filete `#DEDED8`, filete forte `#B8B8B0`
- Tinta de impressão (spot): azul processo `#2438C9`
- Retículas do spot (dados usam SÓ isso, como retícula de impressão): 10% `#E9EBFA`, 25% `#C8CEF3`, 50% `#93A0E6`, 75% `#5B6CD9`, 100% `#2438C9`
- Erro/"de novo": tinta preta com hachura diagonal (impressão de duas cores não ganha terceira cor)
- "Sem evidência" (unknown): segmento vazio com borda tracejada, NUNCA pintado como zero

## Tipografia

- Uma família: **Archivo** (variável, eixos wght + wdth), via next/font.
- Display/rotulagem: Archivo semi-expandido bold; corpo: Archivo regular 15-16px.
- Números SEMPRE tabulares (`font-feature-settings: "tnum"`).
- Numeração é hierarquia: capítulos (1, 2, 3), seções (2.1), exercícios (Ex. 041). A numeração
  carrega informação real (identidade dos itens), por isso ela existe; nunca decorativa.

## Composição

- Página máx. 1060px, margem esquerda reservada pra números de seção (coluna de 56px em desktop).
- Separação por filetes horizontais, não por caixas sombreadas. Sombra não existe neste mundo.
- Cabeçalho: wordmark REMYN + sumário numerado (1 Painel · 2 Áreas · 3 Revisão · 4 Histórico · 5 Ajustes),
  aba ativa com sublinhado de 2px na cor spot.
- Radius 2px em tudo (canto de impressão, quase reto).

## Controles e estados

- Botão padrão: papel + borda 1px tinta preta; hover: retícula 10%; primário: spot sólido + texto branco.
- Foco teclado: outline 2px spot com offset 2px.
- Notas de revisão (1 De novo · 2 Difícil · 3 Bom · 4 Fácil): blocos com a tecla impressa num
  quadradinho; "De novo" hachurado de preto, os demais em retícula crescente do spot.
- Barras de competência: 10 segmentos quadrados com borda de filete; preenchidos em retícula do spot.

## Movimento

- Um único momento autoral: a resposta do cartão "imprime" com um wipe curto de clip-path (140ms,
  ease-out). Todo o resto é instantâneo. `prefers-reduced-motion` remove o wipe.

## Voz

- PT-BR simples e falado. Proibido travessão em qualquer texto do produto.
- Sem streak, sem confete, sem "parabéns!!". O tom é o de um bom professor: direto e específico.
