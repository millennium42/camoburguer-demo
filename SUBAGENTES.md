# Camoburguer Demo - SUBAGENTES

## Sequência obrigatória

1. `po_processo`
2. `revisor_processo`
3. `arquiteto_sistema`
4. `revisor_arquitetura`
5. `dominio_db`
6. `revisor_dominio`
7. `backend_core`
8. `revisor_backend`
9. `frontend_ops`
10. `revisor_frontend`
11. `impressao_infra`
12. `revisor_infra`
13. `qa_validacao`
14. `revisor_final`

## Skill obrigatória por subagente

| Subagente | Skill |
| --- | --- |
| `po_processo` | `restaurant-process-orchestrator` |
| `revisor_processo` | `process-gate-review` |
| `arquiteto_sistema` | `restaurant-architecture-designer` |
| `revisor_arquitetura` | `architecture-gate-review` |
| `dominio_db` | `order-finance-domain-modeler` |
| `revisor_dominio` | `domain-db-gate-review` |
| `backend_core` | `restaurant-backend-builder` |
| `revisor_backend` | `backend-gate-review` |
| `frontend_ops` | `operator-ui-builder` |
| `revisor_frontend` | `frontend-gate-review` |
| `impressao_infra` | `print-infra-specialist` |
| `revisor_infra` | `infra-gate-review` |
| `qa_validacao` | `restaurant-demo-qa` |
| `revisor_final` | `release-readiness-review` |

## Doutrina comum

- Use `rtk` em qualquer shell.
- Use `m1nd` primeiro quando houver dúvida estrutural.
- Use `graphify` para impacto, relações e navegação quando o grafo existir.
- Use `Ponytail full` para cortar abstração precoce, dependência desnecessária e arquivos extras.

## Entrega obrigatória de cada subagente

- `paths tocados`
- `artefatos gerados`
- `riscos`
- `premissas`
- `evidência de teste ou validação`
- `handoff para a próxima etapa`

## Poder do revisor

Todo revisor deve encerrar sua passagem em um destes estados:

- `aprovado`
- `aprovado com ressalvas`
- `reprovado`

Toda reprovação deve incluir um checklist de correção objetivo.

## Foco por etapa

- `po_processo`: linguagem ubíqua, atores, jornadas, exceções, regras de operação.
- `arquiteto_sistema`: módulos, boundaries, contratos, eventos, desenho do sistema.
- `dominio_db`: entidades, estados, eventos, schema, integridade.
- `backend_core`: API, serviços, SSE, automações, impressão e financeiro automático.
- `frontend_ops`: clareza operacional, fila, cozinha, caixa e financeiro leve.
- `impressao_infra`: compose, spool, retries, fallback e healthchecks.
- `qa_validacao`: smoke, fluxo feliz, falhas, regressão básica e evidências.
