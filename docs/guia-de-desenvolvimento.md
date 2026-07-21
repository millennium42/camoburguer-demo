# Guia de Desenvolvimento

## Objetivo

Este guia é o contrato executável para evoluir o Camoburguer Demo. Toda mudança deve preservar o núcleo único de pedidos, o ticket da cozinha, os efeitos financeiros idempotentes e a operação local por comandas.

---

## Pré-requisitos

| Ferramenta | Versão | Uso |
|---|---|---|
| Node.js | 22+ | Runtime e testes |
| PostgreSQL | 16+ | Banco de dados |
| Docker + Compose | Qualquer recente | Stack completa local |
| Git | 2.40+ | Controle de versão |

---

## Setup Rápido

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Subir stack completa
docker compose up -d --build

# Popular banco com dados demo
npm run seed:demo

# Rodar testes
npm test
```

---

## Arquitetura de Desenvolvimento

### Monorepo com Workspaces

```
camoburguer-demo/
├── apps/api/           → API Fastify (núcleo)
├── apps/ops-web/       → Frontend operacional (HTML + JS + CSS)
├── apps/print-bridge/  → Bridge de impressão
├── apps/event-simulator/ → Simulador de eventos
├── packages/domain/    → Regras de negócio puras
├── packages/finance-core/ → Lançamentos e agregação
├── packages/shared-types/ → Enums e contratos
├── tests/              → Testes unitários e smoke
└── scripts/            → Utilitários de seed e simulação
```

### Princípios de Implementação

- **Núcleo único**: Reutilizar `packages/domain` para regras e `orders` para rodadas; canais não ganham núcleos paralelos.
- **Migrações idempotentes**: O `schemaSql` aceita banco vazio e populado; colunas novas usam defaults compatíveis.
- **Transações atômicas**: Pedido + estoque + ticket na mesma transação. Nunca persistir pela metade.
- **Append-only**: Correções geram cancelamento, reversão ou ajuste compensatório — nunca exclusão.
- **Frontend sem framework**: HTML nativo, CSS e JavaScript enquanto a interface permanecer pequena.
- **Ticket primeiro**: Atualizar `docs/padrao-ticket-cozinha.md` quando o contrato impresso mudar.

---

## Validação

### Testes Unitários (30 testes)

```bash
npm test
```

Cobre: domínio (descontos, adicionais, cálculos), financeiro (caixa, turnos, lançamentos) e UI (escapeHtml, renderização, carrinho).

### Smoke Test End-to-End

```bash
npm run smoke
```

Simula operação completa: abertura de turno, pedidos multicanal, comandas com rodadas, pagamentos, sangria, estorno e fechamento.

### Validação Visual

Após mudanças no frontend, verificar:
- Desktop (1920×1080)
- Tela estreita (390px) — sem overflow horizontal
- Console do navegador — sem erros ou warnings

---

## Protocolo Git

### Convenção de Commits

```
tipo(escopo): descrição curta

Tipos: feat | fix | docs | refactor | test | style | chore
Escopo: api | ops-web | domain | finance | render | docs
```

### Fluxo de Trabalho

1. Garantir árvore limpa e testes passando
2. Implementar com documentação e testes no mesmo diff
3. Commitar com mensagem descritiva
4. Verificar: `npm test` + `git diff --check`
5. Push para `main`

### Checklist Pré-Push

- [ ] `npm test` — 30/30 verdes
- [ ] `git diff --check` — sem whitespace errors
- [ ] Documentação atualizada (se aplicável)
- [ ] 5W2H registrado para features novas
- [ ] Frontend conferido em navegador

---

## Desenvolvimento com IA

O Camoburguer foi projetado para evolução assistida por agentes de IA. As regras estão em `AGENTS.md` e o pipeline de agentes em `SUBAGENTES.md`.

### Doutrina Ponytail Full

> Preferir o caminho mais curto, recursos nativos da plataforma e o menor número de peças móveis.

### Contexto Estável (Prompt Prefix)

O contexto para qualquer implementação assistida por IA deve seguir esta ordem:

1. `AGENTS.md` — regras operacionais
2. `docs/guia-de-desenvolvimento.md` — este guia
3. `docs/arquitetura-do-sistema.md` — decisões e fronteiras
4. Skill do papel atual (se aplicável)

### Ferramentas de Orientação

```bash
# Análise estrutural rápida (primeira ação em tarefas não-triviais)
rtk m1nd agent first-minute --repo . --query "o que vou mudar" --json

# Consultar grafo do projeto
rtk graphify query "como funciona o estoque?"
rtk graphify path "orders" "finance_entries"
rtk graphify explain "tab_payments"

# Atualizar grafo após mudanças de código
rtk graphify update .
```

### Pipeline de Agentes

O desenvolvimento segue uma cadeia de 14 agentes especializados (detalhes em `SUBAGENTES.md`):

```
po_processo → revisor → arquiteto → revisor → dominio_db → revisor →
backend_core → revisor → frontend_ops → revisor → impressao_infra → revisor →
qa_validacao → revisor_final
```

Cada agente entrega: paths tocados, artefatos gerados, riscos, premissas, evidência de teste e handoff.

### Boas Práticas para Agentes

| Prática | Motivo |
|---|---|
| Ler `AGENTS.md` primeiro | Entender limites e doutrina |
| Consultar Graphify antes de grep amplo | Evitar leitura especulativa de arquivos |
| Manter um commit por entrega | Facilitar rollback e revisão |
| Registrar 5W2H para cada feature | Rastreabilidade decisória |
| Nunca criar segundo núcleo de pedidos | Invariante arquitetural |
| Testar antes de commitar | 30 testes devem passar |

---

## Registro 5W2H

Cada entrega deve adicionar uma entrada no arquivo `docs/5w2h-evolucao.md` contendo:

| Campo | Pergunta |
|---|---|
| **What** | O que foi feito? |
| **Why** | Por que foi necessário? |
| **Where** | Onde impactou no código? |
| **When** | Quando se aplica operacionalmente? |
| **Who** | Quem é responsável por cada parte? |
| **How** | Como foi implementado tecnicamente? |
| **How much** | Qual a superfície técnica (tabelas, rotas, dependências)? |

Além da tabela, registrar: critérios de aceite, evidências, riscos com mitigação e plano de rollback.

---

## Rollback e Troubleshooting

- **Schema aditivo**: Rollback desativa rota/tela sem remover dados.
- **Conflito 409**: Recarregar agregado e repetir com nova chave idempotente.
- **Falha de impressão**: Preservar pedido; reprocessar `print_job`.
- **Falha Docker**: Verificar `docker compose ps` e logs antes de reconstruir volumes.
- **Nunca**: Apagar volumes ou reescrever histórico Git para corrigir problema de aplicação.

---

## Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm test` | Roda 30 testes unitários |
| `npm run smoke` | Smoke test E2E |
| `npm run start:api` | Inicia API Fastify |
| `npm run start:print` | Inicia Print Bridge |
| `npm run seed:demo` | Popular banco com dados demo |
| `npm run graph:update` | Atualizar Graphify via WSL |
