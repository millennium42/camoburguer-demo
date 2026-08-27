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

## Solicitação operacional vigente

Completar Bloco 2 + commits granulares + push + handoff + **CI REMOTO
VERDE**. Usar workflow multiagente, diferentes modelos/esforços, um
microproblema por vez, implementação → review extensa proporcional ao risco →
red/green. Sequência econômica: Luna/low docs/triagem; Luna/medium mudança
delimitada; Terra/high review dados/segurança; Sol/high somente escalada
bloqueante. Reusar agentes/contexto, cápsulas concisas, sem repetições.

Preservar IDs/status/evidências para continuar os mesmos subagentes após
interrupção/compactação quando a plataforma permitir; não alegar retomada
garantida se indisponível. Uma microtarefa escritora por vez, review
independente, testes vermelhos antes e verdes depois, sem alterar testes para
esconder erro, commit focado após revisão. Nunca declarar completo sem CI verde
no SHA publicado e handoff com limites. O mesmo fluxo vale futuramente por
preferência explícita do usuário, mantendo autorização da plataforma e sem
simular subagentes. Para typo, evitar cerimônia cara, mas manter review e
registrar a economia. Preservar mudanças preexistentes e limites de segurança.

## Continuidade e operação do host

Orientação explícita do usuário: **NUNCA interromper subagentes em andamento**,
sem se importar com o tempo que levarem. Não usar `interrupt=true`, `close` ou
`terminate` em agente em andamento por impaciência/tempo; aguardar e retomar
IDs. Mensagens de orientação devem ser enfileiradas sem interromper.

O comando WSL robusto é `--exec env PATH=... rtk`, não `-- env`. Como `rg` não
está disponível no WSL, usar `rtk /usr/bin/grep` ou leitura focada. O m1nd
first-minute Linux tentou e recebeu `needs_authority`; usar o fallback
Graphify + prova direta autorizado pelo payload.
