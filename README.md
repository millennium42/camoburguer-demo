# Camoburguer Demo

Aplicação operacional de hamburgueria para pedidos, comandas, cozinha, estoque e caixa gerencial em um núcleo único.

> Estado: **demo validada localmente**. O deploy público pode estar em commit anterior. iFood/Delivery Much não estão homologados e não devem ser habilitados com dados reais enquanto API/SSE estiverem sem autenticação de operador.

## O que funciona

- pedidos manuais de balcão, WhatsApp e OlaClick;
- comandas/mesas com rodadas e cancelamentos corretivos;
- catálogo snapshot, adicionais e descontos;
- estoque transacional para `xis`, `dog` e `hamburguer`;
- fila da cozinha e estados do pedido;
- pagamentos parciais, estorno, abertura, reforço, sangria e fechamento;
- ticket textual persistido em `print_jobs` e spool idempotente;
- SSE para atualização da interface;
- adapters iFood e Delivery Much atrás de flags, ainda sem homologação real.

## Limites importantes

- Não há login/identidade de operador.
- Rotas operacionais de leitura e escrita não podem receber dados reais na internet nesse estado.
- O print bridge em nuvem grava arquivo remoto; não imprime na rede local da cozinha.
- O financeiro é gerencial v1, sem fiscal e sem CMV por receita.
- Catálogo é o snapshot OlaClick capturado em 2026-07-16.

Veja a [auditoria integral](docs/auditoria-tecnica-2026-07-21.md) e a [matriz dos 82 commits](docs/auditoria-commit-a-commit.md).

## Arquitetura

```text
manual/partners
      │
      ▼
adapters/API Fastify ──► packages/domain
      │                       │
      ▼                       ▼
 PostgreSQL              ticket canônico
      │                       │
      ├── orders/estoque      ▼
      ├── comandas/finance  print_jobs ──► print-bridge ──► spool
      └── channel events/commands
      │
      ▼
ops-web + SSE
```

Princípios:

- `orders` é o único núcleo operacional;
- pedido + baixa de estoque + reserva de impressão formam uma transação;
- correções financeiras/estoque/ticket usam efeitos compensatórios;
- diferenças de canal ficam nos adapters;
- UI apresenta estado e não redefine regra de domínio.

## Estrutura

```text
apps/api/                 API, persistência, SSE e adapters
apps/ops-web/             painel estático do operador
apps/print-bridge/        spool autenticado
apps/event-simulator/     utilitário de demo
packages/domain/          regras puras de pedido, caixa e ticket
packages/finance-core/    efeitos e resumos gerenciais
packages/shared-types/    enums/contratos
scripts/                  seed, Graphify e verificação
tests/                    unitário, contrato, UI e smoke
docs/                     operação, arquitetura, auditoria e runbooks
```

## Início rápido no Ubuntu/WSL

Pré-requisitos: Node.js 22+, npm, WSL 2/Ubuntu e Docker Desktop com integração WSL.

```bash
cd /mnt/c/Users/milla/Documents/Projetos/Git/camoburguer-demo
rtk npm ci
rtk proxy docker compose -p camoburguer-dev up -d --build
```

URLs:

- painel: `http://localhost:8081`;
- API: `http://localhost:3001/health`;
- bridge: `http://localhost:3100/health`.

Ao terminar:

```bash
rtk proxy docker compose -p camoburguer-dev down
```

Não use `down -v` no projeto padrão sem intenção explícita de apagar dados.

## Validação

```bash
rtk npm run check
rtk npm test
rtk npm audit --omit=dev
rtk proxy env PRINT_BRIDGE_TOKEN=local-print-bridge-token npm run smoke
rtk git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check
```

`cr-at-eol` evita que o checkout CRLF do Windows seja confundido com espaço sobrando; espaços reais continuam sendo rejeitados.

Snapshot desta auditoria:

| Gate | Resultado |
|---|---|
| sintaxe | todos os arquivos JS/MJS válidos |
| testes | 36/36 |
| audit npm produção | 0 vulnerabilidades conhecidas |
| imagens Docker | build aprovado |
| API/PostgreSQL/bridge | health aprovado |
| smoke E2E | aprovado |
| SSE/CORS | aprovado localmente |

O smoke pressupõe a stack local e um banco descartável/preparado. Ele cria e altera dados.

## Impressão

Ticket de cozinha:

```text
buildKitchenTicket()
  → print_jobs (na transação do pedido)
  → API envia bearer + payload
  → print-bridge valida e grava uma vez por jobId
```

`window.print()` permanece somente para relatório financeiro de turno. O formato está em [docs/padrao-ticket-cozinha.md](docs/padrao-ticket-cozinha.md).

## Integrações

As flags começam desligadas:

```env
IFOOD_ENABLED=false
DELIVERYMUCH_ENABLED=false
```

iFood usa autenticação centralizada, polling do módulo Events, detalhes do Order e ACK após commit. Delivery Much depende da especificação privada do estabelecimento. Nenhum dos dois foi validado com credenciais reais nesta auditoria.

Antes de habilitar, cumprir [docs/roteiro-fase2-producao.md](docs/roteiro-fase2-producao.md).

## Segurança/configuração

Variáveis principais:

| Variável | Default local | Função |
|---|---|---|
| `DATABASE_URL` | PostgreSQL local | conexão da API |
| `PRINT_BRIDGE_URL` | `http://127.0.0.1:3100` | destino do spool |
| `PRINT_BRIDGE_TOKEN` | vazio em dev | bearer API ↔ bridge; obrigatório no bridge em produção |
| `CORS_ORIGINS` | localhost + demo Render | allowlist separada por vírgula |
| `AUTO_SEED` | `false` | deve permanecer `false`; qualquer outro valor faz o boot falhar fechado |
| `DEMO_ADMIN_TOKEN` | vazio | seed/anonimização ficam desabilitados |
| `APP_ENV` | `development` | deve ser exatamente `demo` para permitir seed |
| `DEMO_SEED_ENABLED` | `false` | habilitação explícita e temporária do seed |
| `DEMO_SEED_TARGET` | vazio | alvo resolvido exato, sem credenciais, no formato `endereco:porta/banco` |

O Blueprint do Render gera/referencia segredos para bridge/admin e adiciona headers do site. Isso não substitui autenticação do operador.

O seed nunca roda no boot. Em um banco de demo inequivocamente descartável e no baseline
permitido, configure os quatro gates acima e envie `POST /demo/seed` autenticado com JSON
`{"confirmTarget":"endereco:porta/banco"}`. A API resolve o alvo no PostgreSQL, bloqueia e
verifica as 13 tabelas antes da primeira mutação. O CLI é apenas um cliente HTTP:
`DEMO_API_URL=http://127.0.0.1:3001 DEMO_ADMIN_TOKEN=... npm run seed:demo -- --confirm-target=endereco:porta/banco`.
Ele não abre PostgreSQL; o token do chamador e todos os demais gates são verificados pela API.

## Desenvolvimento com IA

Toda tarefa deve obedecer `AGENTS.md` e o [guia de desenvolvimento assistido por IA](docs/guia-de-desenvolvimento.md):

- WSL e `rtk` para shell;
- `m1nd` primeiro em tarefa não trivial;
- Graphify antes de navegação ampla e depois de mudança central;
- Ponytail full;
- preservar trabalho preexistente;
- teste/documentação no mesmo diff;
- distinguir prova direta de inferência;
- sem push/deploy sem autorização.

Papéis opcionais e gates estão em [SUBAGENTES.md](SUBAGENTES.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [Auditoria técnica](docs/auditoria-tecnica-2026-07-21.md) | achados, correções, provas e bloqueadores |
| [Auditoria commit a commit](docs/auditoria-commit-a-commit.md) | 82 commits avaliados |
| [Arquitetura](docs/arquitetura-do-sistema.md) | módulos, dados e fronteiras |
| [Ciclo do pedido](docs/ciclo-do-pedido.md) | estados e invariantes |
| [Ciclo financeiro](docs/ciclo-financeiro.md) | caixa, pagamentos e efeitos |
| [Ticket da cozinha](docs/padrao-ticket-cozinha.md) | contrato textual e transporte |
| [Deploy Render](docs/RENDER_DEPLOY.md) | publicação segura da demo |
| [Roteiro de produção](docs/roteiro-fase2-producao.md) | gates ordenados |
| [Guia IA](docs/guia-de-desenvolvimento.md) | workflow e definição de pronto |

## Deploy público observado

- painel: [camoburguer-ops-web.onrender.com](https://camoburguer-ops-web.onrender.com/)
- API esperada: `https://camoburguer-api.onrender.com`
- bridge esperado: `https://camoburguer-bridge.onrender.com`

Não há alteração automática desse ambiente a partir do working tree local.
