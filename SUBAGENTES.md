# Camoburguer Demo — papéis de revisão por IA

## Regra de uso

Subagentes não são ritual obrigatório para toda mudança. Use-os apenas quando o usuário/plataforma autorizar delegação e quando houver subtarefas independentes. Uma correção local deve seguir Ponytail e permanecer com um agente.

A cadeia completa é reservada a release estrutural que cruza processo, domínio, backend, frontend e infraestrutura. Quando não houver delegação, o agente principal usa os mesmos papéis como checklist, sem simular aprovações independentes.

## Seleção por blast radius

| Área alterada | Maker | Revisor/gate | Skill local |
|---|---|---|---|
| jornada/regra operacional | `po_processo` | `revisor_processo` | `restaurant-process-orchestrator` / `process-gate-review` |
| arquitetura/contrato | `arquiteto_sistema` | `revisor_arquitetura` | `restaurant-architecture-designer` / `architecture-gate-review` |
| domínio/schema/financeiro | `dominio_db` | `revisor_dominio` | `order-finance-domain-modeler` / `domain-db-gate-review` |
| API/integrações/SSE | `backend_core` | `revisor_backend` | `restaurant-backend-builder` / `backend-gate-review` |
| interface do operador | `frontend_ops` | `revisor_frontend` | `operator-ui-builder` / `frontend-gate-review` |
| impressão/Compose/deploy | `impressao_infra` | `revisor_infra` | `print-infra-specialist` / `infra-gate-review` |
| validação/release | `qa_validacao` | `revisor_final` | `restaurant-demo-qa` / `release-readiness-review` |

## Sequência para release transversal

```text
processo → arquitetura → domínio/DB → backend → frontend → impressão/infra → QA → revisão final
```

Maker e revisor não devem editar simultaneamente o mesmo arquivo. O revisor recebe o diff e as evidências já produzidas; não repete trabalho sem motivo.

## Doutrina comum

- Todo shell pelo WSL e prefixado com `rtk`.
- `m1nd` é a primeira camada estrutural em tarefa não trivial.
- Graphify orienta impacto e deve ser atualizado ao final.
- Ponytail full: menor solução que satisfaz o contrato.
- Nenhum papel pode declarar produção pronta sem autenticação, sandbox dos parceiros, backup/restore e impressão real validados.

## Entrega de cada papel

- paths tocados;
- artefatos gerados;
- decisões/premissas;
- riscos por severidade;
- evidência executada;
- lacunas não testadas;
- rollback;
- handoff objetivo.

## Poder do gate

O gate termina em `aprovado`, `aprovado com ressalvas` ou `reprovado`. Toda ressalva/reprovação aponta evidência e checklist de correção. Ausência de teste real deve ser descrita como ausência, nunca convertida em aprovação presumida.
