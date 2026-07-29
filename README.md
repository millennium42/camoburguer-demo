# Camoburguer Demo

O Camoburguer Demo é um projeto focado no desenvolvimento de um sistema resiliente de gestão de pedidos, cozinhas (KDS), caixas e integrações (Delivery Much / iFood) operado por inteligência artificial autônoma sob as diretrizes do programa **M1ND-10**.

Todo o acervo de conhecimento deste software, incluindo arquitetura, fluxos financeiros, padronização de integrações e relatórios técnicos, foi unificado e consolidado para servir como fonte única de verdade ao longo da evolução contínua da base de código.

---

## Índice da Documentação Central

Toda a documentação agora reside no documento estruturado em:
👉 **[docs/CAMOBURGUER_DOCS.md](docs/CAMOBURGUER_DOCS.md)**

Abaixo estão os acessos diretos para as seções dentro do documento:

### 1. Visão Geral e Arquitetura
* [Contexto Operacional](docs/CAMOBURGUER_DOCS.md#contexto-operacional) - Escopo e atores envolvidos.
* [Arquitetura do Sistema](docs/CAMOBURGUER_DOCS.md#arquitetura-do-sistema) - Módulos, tabelas e fronteiras (Eventos vs HTTP).
* [Guia de Desenvolvimento](docs/CAMOBURGUER_DOCS.md#guia-de-desenvolvimento) - Contratos rígidos, boas práticas para IA, estilo e fluxos de commit.
* [Design](docs/DESIGN.md) - Tokens, tipografia, ergonomia e a fronteira atual entre shell React e console legado.

### 2. Operação e Regras de Negócio
* [Ciclo do Pedido](docs/CAMOBURGUER_DOCS.md#ciclo-do-pedido) - Estados de roteamento (Caixa → Cozinha → Despacho).
* [Ciclo Financeiro e Caixa](docs/CAMOBURGUER_DOCS.md#ciclo-financeiro) - Fluxo de abertura e fechamento de `cash_shifts`.
* [Pagamentos e Comandas](docs/CAMOBURGUER_DOCS.md#pagamentos-comandas) - Vinculação de tabs, rodadas e reconciliação.
* [Estoque](docs/CAMOBURGUER_DOCS.md#estoque) - Fluxo FIFO, snapshot no momento do pedido.
* [Padrão de Ticket da Cozinha](docs/CAMOBURGUER_DOCS.md#padrao-ticket-cozinha) - Modelo rígido de integração com impressoras (Print Bridge).

### 3. Integrações Externas e Automações
* [Canais e Captura](docs/CAMOBURGUER_DOCS.md#canais-e-captura) - Adapter de mapeamento, iFood e DM.
* [Automações por Cenário](docs/CAMOBURGUER_DOCS.md#automacoes-por-cenario) - Reconciliações automáticas baseadas em status de delivery (Ex: `cancel_to_local`).

### 4. Apêndice Histórico e Técnico
* [Deploy no Render](docs/CAMOBURGUER_DOCS.md#render_deploy) - Configurações e variáveis de ambiente.
* [Auditorias e Validações Anteriores](docs/CAMOBURGUER_DOCS.md#auditoria-tecnica-2026-07-21) - Relatórios consolidados da Fase 1.
* [Evolução Histórica (5W2H)](docs/CAMOBURGUER_DOCS.md#5w2h-evolucao) - Decisões estruturais e justificativas pré-modernização.

## Gates Locais Antes de Publicar

Para reproduzir os gates usados na CI remota em um checkout limpo:

1. `npm ci`
2. `npm --prefix apps/ops-web ci`
3. `npm run check && npm run lint && npm run typecheck && npm run build && npm test`
4. Suba somente `db` para `npm run test:db`; depois suba `api` e `print-bridge`, execute o seed explícito e então rode `npm run smoke` e `npm run test:e2e`

O E2E usa Playwright contra `http://127.0.0.1:3001`, autentica pelo `/app/`, verifica acessibilidade com axe no shell React e fecha o funil publicado pelo console legado em `/app/legacy/`.
