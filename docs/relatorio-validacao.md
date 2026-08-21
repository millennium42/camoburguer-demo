---
tags: [validacao, qa]
---

# Relatório de Validação — Camoburguer Demo

> As seções abaixo refletem o release da arquitetura v1 (julho/2026). Decisões
> antigas de "sem P0/P1" foram superadas pela auditoria de 2026-07-21, que
> encontrou bloqueadores de produção (listados em [deploy-e-infraestrutura.md](deploy-e-infraestrutura.md)).

---

# Guia de uso

## Auditoria e correção — 2026-07-21

| Gate | Ambiente | Resultado |
|---|---|---|
| Histórico Git | Ubuntu/WSL | 82 commits em todas as refs; 77 no `HEAD`, 5 laterais |
| Estrutura | `m1nd` + Graphify | Núcleo/dependências mapeados; grafo final 221 nós/332 relações |
| Sintaxe | Node 22/WSL | Arquivos alterados válidos; script `npm run check` adicionado |
| Unitário/contrato/UI | Node test runner | 36/36 aprovados |
| Dependências | `npm audit --omit=dev` | 0 vulnerabilidades conhecidas no snapshot |
| Segredos/histórico | `git log --all` | 0 ocorrências; `.env` fora do Git |
| Build | Docker Compose `camoburguer-audit` | API, web e bridge reconstruídos |
| Serviços | PostgreSQL/API/bridge/web | DB/API/bridge saudáveis; web ativo |
| Seed | Container da API | Transacional; abertura `opening = 150` |
| Smoke | Host WSL contra Compose | Aprovado; 4 origens, caixa esperado 128,40 e replay do spool |
| Segurança local | HTTP | Seed sem token `503`; bridge sem bearer `401` |
| SSE | HTTP com Origin local | `200`, ACAO correto, retry e stream |
| Navegador local | Chrome | Painel renderizado, API conectada e console sem entradas |
| Aplicação pública | Chrome/curl somente leitura | **Versão anterior**; API pública, SSE reconectando |

### Decisão atual:
- **Demo local corrigida:** APROVADA
- **Redeploy das correções:** NÃO EXECUTADO
- **Integrações reais (iFood/DM):** REPROVADAS ATÉ AUTENTICAÇÃO + SANDBOX
- **Produção:** REPROVADA

---

## Incrementos validados (Sprint de transição)

### Estoque por categorias
| Comando | Ambiente | Resultado | Evidência |
|---|---|---|---|
| `rtk npm test` | Windows/Node 24 | Aprovado | 25/25 testes |
| `docker compose up -d` | WSL 2 | Aprovado | API/frontend reconstruídos |
| `rtk npm run smoke` | host contra containers | Aprovado | Transação única e rollback comprovados |

### Pagamentos múltiplos
| Comando | Ambiente | Resultado | Evidência |
|---|---|---|---|
| `rtk npm test` | Windows/Node 24 | Aprovado | 28/28 testes |
| `rtk npm run smoke` | host contra compose | Aprovado | Pagamento Pix+Débito, recusa excesso |

### Retirada e filtros financeiros
| Comando | Ambiente | Resultado | Evidência |
|---|---|---|---|
| `rtk npm test` | Windows/Node 24 | Aprovado | 29/29 testes |
| `rtk npm run smoke` | host contra compose | Aprovado | Smoke completo em 26s |

---

# Guia de desenvolvimento

## Sequência Maker/Reviewer obrigatória

| Papel | Impacto e evidência/handoff |
|---|---|
| `po_processo` | Jornadas e exceções no README e Contexto Operacional |
| `arquiteto_sistema` | Persistência consolidada e Graphify atualizado |
| `dominio_db` | Regras puras, testes unitários e migrations PostgreSQL |
| `backend_core` | Idempotência, concorrência e conflitos `409` via smoke |
| `frontend_ops` | Responsivo 390px, filtros e testes UI DOM |
| `impressao_infra` | Compose, bridge, spool e script idempotente |
| `qa_validacao` | Testes totais, E2E, Graphify, console limpo |
| `revisor_final` | Confirma a ausência de P0/P1 sem alterar código |

## Incidente de validação resolvido

**Problema:** O primeiro smoke desta etapa recebeu `UND_ERR_SOCKET` enquanto o
Compose ainda recriava API e frontend. A sondagem inicial alcançou containers
antigos.
**Solução e regra:** `docker compose ps -a` confirmou API saudável. Exigir
estabilidade simultânea por 15 segundos antes do smoke. A regra operacional foi
incorporada ao `guia-de-desenvolvimento.md`.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[historico-evolucao.md](historico-evolucao.md) ·
[guia-de-desenvolvimento.md](guia-de-desenvolvimento.md) ·
[deploy-e-infraestrutura.md](deploy-e-infraestrutura.md)
