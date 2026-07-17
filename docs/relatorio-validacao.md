# Relatório de Validação

Linha de base herdada de `codex/descontos-por-item-e-pedido` (`9174d61`), revisada em 2026-07-16. Cada incremento posterior acrescenta sua própria evidência antes da promoção.

## Gates executados

| Gate | Estado | Evidência principal |
| --- | --- | --- |
| Processo | aprovado | jornadas e regras registradas nos documentos operacionais |
| Arquitetura | aprovado com ressalvas resolvidas | idempotência, transações e fronteiras documentadas |
| Domínio/DB | aprovado | 13 testes unitários/contratuais e constraints PostgreSQL |
| Backend | aprovado | pedido confirmado em uma chamada, efeitos únicos e caixa transacional |
| Frontend | aprovado com ressalva visual | teste DOM, sintaxe e smoke HTTP; automação visual indisponível no host |
| Impressão/Infra | aprovado | containers saudáveis, spool persistente e retry idempotente |
| QA | aprovado | `npm test`, `npm run smoke`, healthchecks e inspeção de spool |

## Evidência reproduzível

```powershell
rtk npm test
rtk wsl.exe -d Ubuntu -- docker compose up -d --build
rtk npm run smoke
rtk wsl.exe -d Ubuntu -- docker compose ps
```

Resultados da entrega:

- 13 de 13 testes aprovados na linha de base de descontos.
- Quatro origens de pedido criadas e presentes na fila da cozinha.
- Repetição com a mesma chave devolveu o mesmo pedido.
- Venda repetida gerou exatamente um lançamento.
- Caixa recusou segunda abertura, ajuste fechado e segundo fechamento.
- Caixa aberto refletiu R$ 140,00 após abertura, reforço, sangria e venda em dinheiro do cenário.
- Duas chamadas ao bridge com o mesmo `jobId` produziram um único arquivo.
- Tickets no spool contêm o horário de criação.
- Logs finais da API e do print-bridge sem erro ou aviso.

## Incremento: estoque por categorias

| Comando | Ambiente | Resultado | Evidência | Pendência |
| --- | --- | --- | --- | --- |
| `rtk npm test` | Windows/Node 24 | aprovado | 25/25 testes | nenhuma |
| `rtk wsl.exe -d Ubuntu -- bash -lc "docker compose up -d --build api ops-web"` | WSL 2 + Docker + PostgreSQL | aprovado | API e frontend reconstruídos; healthchecks saudáveis | nenhuma |
| `rtk npm run smoke` | host contra containers WSL | aprovado | migração legada, carga `5`, chave divergente, corrida idempotente, rollback multcategoria, disputa de venda `201/409` e restituição por estágio | nenhuma |
| `graphify extract . --out . --code-only` + `graphify cluster-only` | filesystem Linux nativo no WSL | aprovado após fallback do incremental preso em I/O NTFS | 215 nós, 390 relações e 13 comunidades | nenhuma |
| `rtk graphify explain "changeStock"` | Graphify no Windows | aprovado | `changeStock()` encontrado e ligado a `calculateStockRequirements()` | nenhuma |

O cenário transacional provou que a mesma chave idempotente não duplica carga ou venda, que o saldo nunca é parcialmente alterado quando uma categoria é insuficiente e que o ticket/pedido não sobrevive ao rollback. A revisão peer-to-peer fica registrada na PR correspondente.

O Graphify incremental sobre `/mnt/d` permaneceu bloqueado em I/O. O fallback documentado copiou o código para filesystem Linux nativo, reconstruiu o grafo localmente sem LLM (`--code-only`), clusterizou e promoveu somente os artefatos gerados. A consulta final encontrou `changeStock()` conectado a `calculateStockRequirements()`.

## Risco residual aceito

A automação do navegador embutido não inicializou neste host por erro interno do runtime. A interface foi coberta por teste DOM, contrato HTTP e smoke em container; uma conferência visual rápida em Chrome/Edge continua recomendada antes de uma apresentação pública.
