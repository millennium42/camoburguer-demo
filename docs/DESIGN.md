---
tags: [design, frontend]
---

# Design System e Interface — Camoburguer Demo

> Contrato de linguagem visual, tipografia e regras de layout do painel
> operacional. A interface é utilitária, projetada para alto contraste e
> uso contínuo em ambiente de restaurante. As decisões não usam um framework
> CSS genérico, mas tokens semânticos mapeados diretamente em `styles.css`.

## Direção visual

- Atmosfera operacional escura, com fundo quase preto e acentos âmbar
- Superfícies em glassmorphism leve para destacar cards, modais e estados
- Contraste alto e feedback direto para jornadas longas de operação
- Nenhuma dependência de shell React ou iframe para o fluxo principal

## Tokens canônicos

Baseados em `apps/ops-web-legacy/styles.css`:

| Token | Valor atual | Uso |
|---|---|---|
| `--bg` | `#0d0f12` | Fundo base |
| `--surface` | `#141820` | Superfície estrutural |
| `--card` | `rgba(22, 27, 36, 0.75)` | Cards e painéis |
| `--text` | `#f8fafc` | Texto principal |
| `--muted` | `#94a3b8` | Texto secundário |
| `--accent` | `#f59e0b` | CTA e destaque |
| `--ok` | `#10b981` | Estado positivo |
| `--danger` | `#ef4444` | Erro e alerta crítico |

## Tipografia

- **Corpo:** `Inter`, para leitura rápida em contexto operacional.
- **Títulos:** `Outfit`, para hierarquia de seções e cards.
- **Trava:** novas fontes só devem entrar junto com atualização deste documento
  e do CSS.

## Layout e ergonomia

- Hero inicial com status da sessão e atalhos rápidos.
- Navegação por abas horizontais com estado ativo forte.
- Grids responsivos para pedidos, cozinha, financeiro e comandas.
- Modais nativos com foco em cadastro, catálogo e operações de caixa.
- Em telas menores, interfaces tabulares viram listas em cartões ou escondem
  colunas menos críticas.
- O layout de balcão acomoda o carrinho à direita sempre visível em telas grandes.

## Acessibilidade e Motion

- Labels explícitos em formulários centrais.
- Foco visível via borda e glow do token de destaque.
- Transições de `fade-in` e `slide-in` variam entre `150ms` e `200ms` sem bounciness.
- Obrigatório respeito à diretiva `prefers-reduced-motion` para anular interpolação.
  Animações de loading permanecem, sem pulsações fortes.
- Testes automatizados com `axe` no login e no console.

## Superfície publicada

O fluxo operacional publicado é único em `/app/`. O caminho `/app/legacy/`
permanece apenas como redirect de compatibilidade para `/app/`.

## Provas automatizadas relacionadas

- `npm run check`
- `npm run test:frontend`
- `npm run test:a11y`
- `npm run test:e2e`

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md)
