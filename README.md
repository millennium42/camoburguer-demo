# Camoburguer Demo

Camoburguer Demo e um sistema de operacao para pedidos, cozinha, caixa e integracoes, com a documentacao consolidada em um ponto central.

## Indice da documentacao central

Toda a documentacao principal reside em [docs/CAMOBURGUER_DOCS.md](docs/CAMOBURGUER_DOCS.md).

### 1. Visao geral e arquitetura
* [Contexto Operacional](docs/CAMOBURGUER_DOCS.md#contexto-operacional) - Escopo e atores envolvidos.
* [Arquitetura do Sistema](docs/CAMOBURGUER_DOCS.md#arquitetura-do-sistema) - Modulos, tabelas e fronteiras.
* [Guia de Desenvolvimento](docs/CAMOBURGUER_DOCS.md#guia-de-desenvolvimento) - Contratos, estilo e fluxo de entrega.
* [Design](docs/DESIGN.md) - Contrato visual e ergonomico do console legado publicado em `/app/`.

### 2. Operacao e regras de negocio
* [Ciclo do Pedido](docs/CAMOBURGUER_DOCS.md#ciclo-do-pedido) - Estados de roteamento do pedido.
* [Ciclo Financeiro e Caixa](docs/CAMOBURGUER_DOCS.md#ciclo-financeiro) - Fluxo de abertura e fechamento de `cash_shifts`.
* [Pagamentos e Comandas](docs/CAMOBURGUER_DOCS.md#pagamentos-comandas) - Vinculacao de tabs, rodadas e reconciliacao.
* [Estoque](docs/CAMOBURGUER_DOCS.md#estoque) - Fluxo FIFO e snapshot no momento do pedido.
* [Padrao de Ticket da Cozinha](docs/CAMOBURGUER_DOCS.md#padrao-ticket-cozinha) - Contrato de impressao com a Print Bridge.

### 3. Integracoes externas e automacoes
* [Canais e Captura](docs/CAMOBURGUER_DOCS.md#canais-e-captura) - Mapeamento de canais e adaptadores.
* [Automacoes por Cenario](docs/CAMOBURGUER_DOCS.md#automacoes-por-cenario) - Reconciliacoes automaticas por status.

### 4. Apendice historico e tecnico
* [Deploy no Render](docs/CAMOBURGUER_DOCS.md#render_deploy) - Configuracoes e variaveis de ambiente.
* [Auditorias e Validacoes Anteriores](docs/CAMOBURGUER_DOCS.md#auditoria-tecnica-2026-07-21) - Evidencias historicas.
* [Evolucao Historica (5W2H)](docs/CAMOBURGUER_DOCS.md#5w2h-evolucao) - Decisoes estruturais anteriores.

## Gates locais antes de publicar

Para reproduzir os gates locais em um checkout limpo:

1. `npm ci`
2. `npm run check && npm test`
3. Suba somente `db` para `npm run test:db`
4. Suba `api` e `print-bridge`, execute o seed explicito e rode `npm run smoke`, `npm run test:a11y` e `npm run test:e2e`

O produto publicado usa apenas o console legado servido em `/app/`. O caminho `/app/legacy/` existe apenas como redirecionamento de compatibilidade para `/app/`.
