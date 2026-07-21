# 🍔 Camoburguer Demo

> **Plataforma operacional de hamburgueria: pedidos, cozinha, estoque, caixa e delivery em um núcleo único.**

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify)](https://fastify.dev/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com/)
[![Testes](https://img.shields.io/badge/Testes-30%2F30-brightgreen)]()

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Início Rápido (Local)](#início-rápido-local)
- [Testes](#testes)
- [Deploy em Nuvem (Render)](#deploy-em-nuvem-render)
- [Funcionalidades](#funcionalidades)
- [Fluxo do Pedido](#fluxo-do-pedido)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Desenvolvimento com IA](#desenvolvimento-com-ia)
- [Documentação Técnica](#documentação-técnica)
- [Cronologia do Projeto](#cronologia-do-projeto)

---

## Visão Geral

O **Camoburguer** centraliza todos os canais de atendimento (Balcão, WhatsApp, iFood, OlaClick) em uma **fila única de pedidos**. Cada pedido transita por uma máquina de estados estrita, com estoque transacional, impressão atômica e caixa gerencial imutável.

### Princípios

| Princípio | Implementação |
|---|---|
| **Núcleo único** | Um só motor de pedidos para todos os canais |
| **Transação atômica** | Pedido + estoque + ticket na mesma transação DB |
| **Idempotência nativa** | `Idempotency-Key` em todas as mutações |
| **Append-only** | Estoque, pagamentos e financeiro nunca sofrem `UPDATE` destrutivo |
| **Sem login (v1)** | Posto operacional único, sem autenticação |

---

## Arquitetura

```
                    ┌─────────────────────────────────────────┐
                    │         FONTES DE PEDIDO                │
                    │  Balcão · WhatsApp · iFood · OlaClick   │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │      NÚCLEO ÚNICO DO CAMOBURGUER        │
                    │   API Fastify + Domínio Transacional    │
                    │         PostgreSQL (pg)                 │
                    └────────┬──────────────────────┬─────────┘
                             │                      │
                             ▼                      ▼
                ┌────────────────────────┐  ┌────────────────────────┐
                │    PAINEL OPERADOR     │  │   FILA DA COZINHA      │
                │  Comandas & Financeiro │  │   Impressão & SSE      │
                └────────────────────────┘  └────────────────────────┘
```

### Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Runtime** | Node.js 22+ (ES Modules) |
| **API** | Fastify 5 + `@fastify/cors` + `@fastify/helmet` + `@fastify/rate-limit` |
| **Banco** | PostgreSQL 16+ (migrações idempotentes no boot) |
| **Frontend** | HTML5 + Vanilla JS + CSS (sem framework) |
| **Impressão** | `window.print()` client-side + Print Bridge (Fastify) |
| **Infra** | Docker Compose (local) · Render PaaS (produção) |
| **Testes** | Node.js Test Runner nativo (30 testes unitários + smoke E2E) |

---

## Estrutura do Projeto

```
camoburguer-demo/
├── apps/
│   ├── api/                 # API Core (Fastify): rotas, domínio, banco, SSE
│   │   └── src/server.js    # Servidor principal (~1250 linhas)
│   ├── ops-web/             # Interface operacional (HTML + JS + CSS)
│   │   ├── index.html       # SPA do operador
│   │   ├── main.js          # Lógica, estado e renderização
│   │   └── styles.css       # Design dark brown premium
│   ├── print-bridge/        # Serviço de impressão e spooler
│   └── event-simulator/     # Utilitário para carga demo
├── packages/
│   ├── domain/              # Entidades, regras de catálogo e cálculos
│   ├── finance-core/        # Lançamentos gerenciais e agregação
│   └── shared-types/        # Enums e contratos compartilhados
├── tests/
│   ├── domain.test.js       # Testes de domínio (descontos, adicionais, itens)
│   ├── finance.test.js      # Testes financeiros (caixa, turnos, lançamentos)
│   ├── ops-web.test.js      # Testes de UI (renderização, escapeHtml, carrinho)
│   └── smoke.mjs            # Teste end-to-end integrado
├── scripts/
│   ├── seed-demo.mjs        # Popular banco com dados de demonstração
│   └── simulate-order.mjs   # Simulação de pedido para testes
├── docs/                    # Documentação técnica completa
├── render.yaml              # Blueprint de deploy no Render
├── docker-compose.yml       # Stack local (PostgreSQL + API + Bridge + Web)
├── AGENTS.md                # Regras para agentes de IA
├── SUBAGENTES.md            # Pipeline de subagentes e revisores
└── package.json             # Monorepo com workspaces npm
```

---

## Início Rápido (Local)

### Pré-requisitos

- **Node.js** 22+
- **Docker** e **Docker Compose** (para stack completa)
- **PostgreSQL** 16+ (se preferir sem Docker)

### Via Docker Compose (recomendado)

```bash
# Subir a stack completa
docker compose up -d --build

# Popular com dados de demonstração
node scripts/seed-demo.mjs
```

### Sem Docker (desenvolvimento)

```bash
# Instalar dependências
npm install

# Configurar variáveis (copiar e editar)
cp .env.example .env

# Iniciar a API (requer PostgreSQL rodando)
npm run start:api
```

### URLs Locais

| Serviço | URL |
|---|---|
| 🖥️ **Painel Operacional** | http://localhost:8081 |
| ⚙️ **API Core** | http://localhost:3001/health |
| 🖨️ **Print Bridge** | http://localhost:3100/health |

---

## Testes

```bash
# Bateria completa (30 testes unitários)
npm test

# Smoke test end-to-end (requer API + banco)
npm run smoke
```

### Cobertura dos Testes

| Suíte | Escopo | Quantidade |
|---|---|---|
| `domain.test.js` | Descontos, adicionais, cálculos, acumulação | ~13 testes |
| `finance.test.js` | Lançamentos, turnos, agregação de caixa | ~10 testes |
| `ops-web.test.js` | escapeHtml, renderização DOM, carrinho | ~7 testes |
| `smoke.mjs` | Fluxo completo E2E contra API real | Integrado |

---

## Deploy em Nuvem (Render)

O arquivo `render.yaml` provisiona toda a infraestrutura em **1 clique**.

### Passo a Passo

1. Crie uma conta em [render.com](https://render.com/)
2. No dashboard, clique em **New +** → **Blueprint**
3. Conecte o repositório `camoburguer-demo`
4. O Render cria automaticamente:

```
┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ PostgreSQL DB    │  │ Fastify API   │  │ Print Bridge     │  │ Ops Web          │
│ camoburguer-db   │  │ camoburguer-  │  │ camoburguer-     │  │ camoburguer-     │
│ (Gerenciado)     │  │ api           │  │ bridge           │  │ ops-web (Static) │
└──────────────────┘  └───────────────┘  └──────────────────┘  └──────────────────┘
```

### URLs de Produção

| Serviço | URL |
|---|---|
| **API** | `https://camoburguer-api.onrender.com` |
| **Ops Web** | `https://camoburguer-ops-web.onrender.com` |
| **Print Bridge** | `https://camoburguer-bridge.onrender.com` |

### Seed Automático

A API detecta banco vazio no boot e executa o seed de demonstração automaticamente (`AUTO_SEED=true`).

> 📖 Guia completo: [docs/RENDER_DEPLOY.md](docs/RENDER_DEPLOY.md)

---

## Funcionalidades

### 📋 Pedidos e Canais

- Fila unificada para Balcão, WhatsApp, iFood e OlaClick
- Fila de autorização para pedidos de delivery (aceitar/recusar)
- Máquina de estados: `received → confirmed → in_preparation → ready → completed`
- Cancelamento parcial/total com ticket corretivo

### 🍽️ Comandas e Mesas

- Abertura por identificador livre (tab ou mesa)
- Rodadas independentes com carrinho dedicado
- Pagamentos parciais (Dinheiro, Pix, Crédito, Débito, App)
- Estorno append-only e encerramento seguro

### 📦 Estoque

- Três categorias: Xis, Dog e Hambúrguer
- Baixa transacional na confirmação do pedido
- Restituição automática em cancelamentos pré-preparo
- Ajuste manual com motivo obrigatório

### 💰 Financeiro e Caixa

- Turnos de caixa (abrir/fechar) com numerário esperado
- Reforço e sangria em caixa aberto
- Faturamento por forma de pagamento
- Impressão de fechamento (resumido e detalhado)

### 🖨️ Impressão

- Ticket de cozinha via `window.print()` (client-side)
- Relatório de turno para impressora térmica
- Print Bridge como backup/spooler

### 🔒 Segurança

- LGPD: rota `/lgpd/anonymize` para anonimização de PII
- Helmet (cabeçalhos de segurança)
- Rate limiting (1000 req/min em demo)
- CORS habilitado

---

## Fluxo do Pedido

```
received ──(Aceite)──► confirmed ──(Preparo)──► in_preparation ──(Pronto)──► ready ──(Concluir)──► completed
    │                      │                          │                       │
    └──(Recusar)───────────┴──────(Cancelar)──────────┴───────────────────────┴───► cancelled
```

### Regra de Cálculo

```
totalItem = (preçoBase + Σ adicionais) × quantidade × (1 − descontoItem/100)
totalPedido = Σ totalItem × (1 − descontoGeral/100)
```

---

## Variáveis de Ambiente

| Variável | Serviço | Descrição | Default |
|---|---|---|---|
| `DATABASE_URL` | API | Conexão PostgreSQL | — |
| `PORT` | API | Porta da API | `3001` |
| `NODE_ENV` | API | Ambiente | `production` |
| `PRINT_BRIDGE_URL` | API | URL do Print Bridge | `https://camoburguer-bridge.onrender.com` |
| `DEFAULT_PRINTER` | API | Impressora padrão | `cozinha-principal` |
| `AUTO_SEED` | API | Seed automático no boot | `true` |

> Veja `.env.example` para a lista completa incluindo integrações iFood/Delivery Much.

---

## Desenvolvimento com IA

O Camoburguer foi projetado para evolução assistida por agentes de IA. O arquivo `AGENTS.md` define as regras operacionais.

### Doutrina Ponytail Full

> **Preferir o caminho mais curto, recursos nativos da plataforma e o menor número de peças móveis.**

### Pipeline de Agentes (`SUBAGENTES.md`)

O desenvolvimento segue uma cadeia de 14 agentes especializados com revisores pareados:

```
po_processo → revisor_processo → arquiteto_sistema → revisor_arquitetura →
dominio_db → revisor_dominio → backend_core → revisor_backend →
frontend_ops → revisor_frontend → impressao_infra → revisor_infra →
qa_validacao → revisor_final
```

### Ferramentas de Orientação

| Ferramenta | Uso | Quando |
|---|---|---|
| **m1nd** | Análise estrutural rápida | Antes de edições não-triviais |
| **Graphify** | Mapa persistente do projeto | Consultar relações e dependências |
| **Ponytail** | Filtro de complexidade | Sempre (doutrina padrão) |

### Guia Rápido para Agentes

```bash
# Orientação estrutural
rtk m1nd agent first-minute --repo . --query "mudança desejada" --json

# Consultar grafo do projeto
rtk graphify query "como funciona o estoque?"
rtk graphify path "orders" "finance_entries"
rtk graphify explain "tab_payments"

# Atualizar grafo após mudanças
rtk graphify update .

# Testes antes de commit
npm test
npm run smoke
```

### Protocolo de Commit

```
feat(escopo): descrição curta     # Nova funcionalidade
fix(escopo): descrição curta      # Correção de bug
docs(escopo): descrição curta     # Documentação
refactor(escopo): descrição curta # Refatoração
test(escopo): descrição curta     # Testes
style(escopo): descrição curta    # Estilo/formatação
chore(escopo): descrição curta    # Manutenção
```

### 5W2H Obrigatório

Cada entrega deve registrar no [5W2H](docs/5w2h-evolucao.md):

| Campo | Pergunta |
|---|---|
| **What** | O que foi feito? |
| **Why** | Por que foi necessário? |
| **Where** | Onde impactou? |
| **When** | Quando se aplica? |
| **Who** | Quem é responsável? |
| **How** | Como foi implementado? |
| **How much** | Qual a superfície técnica? |

---

## Documentação Técnica

| Documento | Conteúdo |
|---|---|
| 📑 [Documentação Central](docs/DOCUMENTACAO_CENTRAL.md) | Guia mestre unificado |
| 🏗️ [Arquitetura](docs/arquitetura-do-sistema.md) | Módulos, fronteiras e decisões |
| 🔄 [Ciclo do Pedido](docs/ciclo-do-pedido.md) | Máquina de estados e regras |
| 💰 [Ciclo Financeiro](docs/ciclo-financeiro.md) | Caixa, turnos e lançamentos |
| 📦 [Estoque](docs/estoque.md) | Controle transacional append-only |
| 🖨️ [Ticket de Cozinha](docs/padrao-ticket-cozinha.md) | Formato de impressão |
| 🚀 [Deploy Render](docs/RENDER_DEPLOY.md) | Guia completo de deploy |
| 📊 [5W2H Evolução](docs/5w2h-evolucao.md) | Histórico decisório completo |
| 🛠️ [Guia de Desenvolvimento](docs/guia-de-desenvolvimento.md) | Protocolo Git e validação |
| 🤖 [AGENTS.md](AGENTS.md) | Regras para agentes de IA |
| 👥 [SUBAGENTES.md](SUBAGENTES.md) | Pipeline de subagentes |

---

## Cronologia do Projeto

| Data | Marco | Commits |
|---|---|---|
| **14/Jul** | Inicialização do repositório e demo operacional completa | `3dd601b` · `bdd41dd` |
| **16/Jul** | Descontos, cardápio OlaClick, adicionais, comandas, estoque e pagamentos | `9174d61`…`b901fd4` |
| **20/Jul** | Entregas 0-5, integrações, redesign UI, impressão, LGPD e segurança | `83a137a`…`dd5fca6` |
| **21/Jul** | Fluxo contínuo de comandas, deploy Render e correções de produção | `384a10f`…`3fb67d4` |

> Histórico completo: `git log --oneline --all`

---

<p align="center">
  <strong>Camoburguer</strong> · Engenharia de ponta para a gastronomia moderna
</p>
