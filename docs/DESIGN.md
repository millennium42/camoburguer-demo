# Camoburguer Design

Este documento é o contrato atual do shell React publicado em `/app/`. Ele substitui descrições históricas que já não batiam com o CSS real.

## Direção visual

- atmosfera quente e operacional, com fundo creme e acentos âmbar/marrom;
- superfícies claras com transparência leve para evitar fadiga em jornadas longas;
- contraste alto e feedback direto, sem animações decorativas pesadas;
- convivência explícita com o console legado em `/app/legacy/` até o funil completo migrar.

## Tokens canônicos

Baseados em [`apps/ops-web/src/index.css`](../apps/ops-web/src/index.css):

| Token | Valor atual | Uso |
| --- | --- | --- |
| `--background` | `hsl(37 56% 98%)` | fundo base do app |
| `--foreground` | `hsl(18 56% 14%)` | texto primário |
| `--primary` | `hsl(21 88% 34%)` | CTA principal |
| `--secondary` | `hsl(33 47% 92%)` | ações secundárias |
| `--accent` | `hsl(29 73% 92%)` | superfícies de apoio |
| `--border` | `hsl(24 43% 84%)` | bordas e inputs |
| `--ring` | `hsl(21 88% 45%)` | foco |
| `--radius` | `1rem` | raio base |

Complementos do shell em [`apps/ops-web/src/App.css`](../apps/ops-web/src/App.css):

- gradiente radial quente no pano de fundo de `.ops-shell`;
- cartões translúcidos brancos com sombra marrom suave;
- pills semânticas com verde, âmbar profundo, vermelho e cinza frio;
- navegação de áreas com botões em formato cápsula e estado ativo escuro.

## Tipografia

- corpo: `IBM Plex Sans`, pensada para leitura operacional rápida;
- títulos: `Outfit`, usada para dar hierarquia sem parecer institucional demais;
- evitar fontes genéricas novas sem atualizar este documento e o CSS.

## Layout e ergonomia

- `header` forte com resumo da sessão e atalhos imediatos;
- navegação de áreas em uma linha quebrável para desktop e tablet;
- grids responsivos com `auto-fit` para cards operacionais;
- `iframe` do console legado ocupando a área principal quando o fluxo completo ainda depende dele.

## Acessibilidade

- labels explícitos em autenticação e formulários centrais;
- foco visível via tokens de borda/ring do design system;
- testes automatizados com axe no login e no shell autenticado via `npm run test:a11y`;
- sem depender de `localStorage` ou metatags para estado sensível de sessão/CSRF.

## Fronteira de migração

Hoje o shell React cobre sessão, visibilidade, leitura operacional e ações administrativas curtas. O funil integral de catálogo e envio de pedido continua canônico no console legado publicado em `/app/legacy/`.

Enquanto essa fronteira existir:

1. qualquer teste E2E principal deve provar os dois lados;
2. documentação não pode fingir que o funil está 100% migrado;
3. mudanças visuais no React não podem quebrar o acesso evidente ao console legado.

## Provas automatizadas relacionadas

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:frontend`
- `npm run test:a11y`
- `npm run test:e2e`
