# Camoburguer Design

Este documento descreve o contrato visual atual do console legado servido em `/app/`.

## Direcao visual

- atmosfera operacional escura, com fundo quase preto e acentos amber;
- superficies em glassmorphism leve para destacar cards, modais e estados;
- contraste alto e feedback direto para jornadas longas de operacao;
- nenhuma dependencia de shell React ou iframe para o fluxo principal.

## Tokens canonicos

Baseados em [`apps/ops-web-legacy/styles.css`](../apps/ops-web-legacy/styles.css):

| Token | Valor atual | Uso |
| --- | --- | --- |
| `--bg` | `#0d0f12` | fundo base |
| `--surface` | `#141820` | superficie estrutural |
| `--card` | `rgba(22, 27, 36, 0.75)` | cards e paineis |
| `--text` | `#f8fafc` | texto principal |
| `--muted` | `#94a3b8` | texto secundario |
| `--accent` | `#f59e0b` | CTA e destaque |
| `--ok` | `#10b981` | estado positivo |
| `--danger` | `#ef4444` | erro e alerta critico |

## Tipografia

- corpo: `Inter`, para leitura rapida em contexto operacional;
- titulos: `Outfit`, para hierarquia de secoes e cards;
- novas fontes so devem entrar junto com atualizacao deste documento e do CSS legado.

## Layout e ergonomia

- hero inicial com status da sessao e atalhos rapidos;
- navegacao por abas horizontais com estado ativo forte;
- grids responsivos para pedidos, cozinha, financeiro e comandas;
- modais nativos com foco em cadastro, catalogo e operacoes de caixa.

## Acessibilidade

- labels explicitos em autenticacao e formularios centrais;
- foco visivel via borda e glow do token de destaque;
- testes automatizados com axe no login e no console autenticado via `npm run test:a11y`;
- sessao e CSRF mantidos por cookie e header, sem depender de armazenamento local.

## Superficie publicada

O fluxo operacional publicado e unico em `/app/`. O caminho `/app/legacy/` permanece apenas como redirect de compatibilidade para `/app/`.

## Provas automatizadas relacionadas

- `npm run check`
- `npm run test:frontend`
- `npm run test:a11y`
- `npm run test:e2e`
