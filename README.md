# Camoburguer Demo

Aplicação operacional de restaurante para centralizar pedidos de Balcão, WhatsApp, iFood e OlaClick, enviar tickets padronizados à cozinha e acompanhar caixa e financeiro gerencial.

## Executar a demo

Pré-requisitos: Docker Desktop com integração WSL, distribuição Ubuntu, Graphify instalado no Ubuntu, Node.js 24+ e npm.

```powershell
rtk wsl.exe -d Ubuntu -- docker compose up -d --build
```

- Operação: <http://127.0.0.1:8081>
- API: <http://127.0.0.1:3001/health>
- Bridge de impressão: <http://127.0.0.1:3100/health>

## Validar

```powershell
rtk npm test
rtk npm run smoke
rtk wsl.exe -d Ubuntu -- docker compose ps
rtk npm run graph:update
```

O smoke cria pedidos nas quatro origens, valida Delivery/Retirada/Local, cozinha, idempotência, impressão, caixa, movimentações, fechamento e financeiro.

## Estrutura

- `apps/ops-web`: interface estática e leve para pedidos, cozinha e financeiro.
- `apps/api`: API, transações, SSE, persistência, idempotência e recuperação de impressão.
- `apps/print-bridge`: spool de ticket em volume persistente.
- `apps/event-simulator`: carga opcional de dados da demo.
- `packages/domain`: regras de pedido, ticket e caixa.
- `packages/finance-core`: lançamentos e resumos financeiros.
- `packages/shared-types`: enumerações compartilhadas.
- `docs/estoque.md`: contrato de saldos, baixas e ajustes das três categorias controladas.
- `docs/`: contratos operacionais e arquitetura em português.
- `skills/` e `SUBAGENTES.md`: processo agent-first com revisão entre pares.
- `graphify-out/`: grafo estrutural navegável do projeto.

O fluxo completo de implementação, revisão, Docker via WSL, RAG e publicação está em [`docs/guia-de-desenvolvimento.md`](docs/guia-de-desenvolvimento.md). O histórico decisório 5W2H está em [`docs/5w2h-evolucao.md`](docs/5w2h-evolucao.md).

## Doutrina de desenvolvimento

- `Ponytail full`: menor solução correta, sem abstrações prematuras.
- `RTK`: prefixo obrigatório dos comandos shell.
- `m1nd`: primeira orientação estrutural antes de busca ampla.
- `Graphify`: mapa persistente; consultar antes de navegação ampla e atualizar após mudanças.

## Limites da v1

Operação de restaurante único e posto único, sem login ou identificação de operador. Integrações com marketplaces continuam manuais; fiscal, CMV por receita e customizações profundas ficam fora desta demo.
