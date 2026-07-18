# Relatório de Validação

Linha de base atual consolidada na `main` (`b901fd4`), revisada em 2026-07-18. Cada incremento posterior nasce de `main`, abre PR contra `main` e acrescenta sua própria evidência antes da promoção.

## Gates executados

| Gate | Estado | Evidência principal |
| --- | --- | --- |
| Processo | aprovado | jornadas e regras registradas nos documentos operacionais |
| Arquitetura | aprovado com ressalvas resolvidas | idempotência, transações e fronteiras documentadas |
| Domínio/DB | aprovado | 13 testes unitários/contratuais e constraints PostgreSQL |
| Backend | aprovado | pedido confirmado em uma chamada, efeitos únicos e caixa transacional |
| Frontend | aprovado | teste DOM, inspeção real desktop/390 px, filtro Pix e console limpo |
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

## Incremento: pagamentos múltiplos

| Comando | Ambiente | Resultado | Evidência | Pendência |
| --- | --- | --- | --- | --- |
| `rtk npm test` | Windows/Node 24 | aprovado | 28/28 testes | nenhuma |
| `rtk node --check` | API, banco, frontend e smoke | aprovado | sintaxe válida | nenhuma |
| `docker compose build api ops-web` | Docker pelo WSL | aprovado | imagens reconstruídas sem vulnerabilidade npm | nenhuma |
| health poll + `rtk npm run smoke` | host contra compose anexado no WSL | aprovado | banco existente migrado e smoke final em 22 s | nenhuma |
| `graphify update .` em filesystem Linux + consultas | Graphify no WSL | aprovado | 423 nós, 575 relações, 46 comunidades; símbolos de pagamento encontrados | nenhuma |

O smoke provou R$ 100 pagos por Pix R$ 30 + débito R$ 70, rejeição de R$ 70,01, permanência aberta com R$ 99,99, retry idempotente, chave divergente em 409, corrida de pagamentos em 201/409 e rejeição sem turno. Também provou pagamento em dinheiro no turno anterior, fechamento preservado em R$ 5,00 e estorno compensatório de R$ 5,00 no turno atual, cujo caixa esperado terminou em R$ 128,40. Pix/débito não alteraram numerário e cada parcela manteve seu método.

## Incremento: retirada e filtros financeiros

| Comando | Ambiente | Resultado | Evidência | Pendência |
| --- | --- | --- | --- | --- |
| `rtk npm test` | Windows/Node 24 | aprovado | 29/29 testes | nenhuma |
| `docker compose build ops-web` | Docker pelo WSL | aprovado | imagem Nginx atualizada | nenhuma |
| health poll + `rtk npm run smoke` | host contra compose anexado no WSL | aprovado | smoke completo em 26 s | nenhuma |
| `graphify update .` em filesystem Linux | Graphify no WSL | aprovado | 425 nós, 578 relações e 46 comunidades | nenhuma |

O smoke comparou faturamento bruto com a soma exclusiva de vendas, confirmou que `cash_withdrawal` não entra em receita, filtrou listagem e resumo por Pix e combinou `type=cash_withdrawal` com `paymentMethod=cash`. A interface gera uma única query para cards/totais e lançamentos e oferece limpeza explícita do filtro.

## Incremento: QA, documentação e release

| Comando/verificação | Ambiente | Resultado | Evidência | Pendência |
| --- | --- | --- | --- | --- |
| `rtk npm test` | Windows/Node 24 | aprovado | 30/30 testes, incluindo regressão responsiva | nenhuma |
| `rtk git diff --check` + `node --check` | host | aprovado | diff e sintaxe sem erro | nenhuma |
| `docker compose build` | Docker pelo Ubuntu/WSL | aprovado | API, ops-web e print-bridge reconstruídos | nenhuma |
| health poll estável + `rtk npm run smoke` | host contra compose WSL | aprovado | API/web/bridge estáveis por 15 s; smoke final em 22,5 s | nenhuma |
| `docker compose ps` | WSL | aprovado | PostgreSQL, API e bridge saudáveis; Nginx ativo | nenhuma |
| navegador desktop | browser conectado à stack local | aprovado | Pedidos, Comandas, Estoque, Cozinha e Financeiro legíveis; console sem warning/error | nenhuma |
| filtro financeiro Pix | browser + API local | aprovado | badge “Filtro ativo: Pix”, R$ 765,00 no conjunto exercitado e zero cards não-Pix | nenhuma |
| viewport 390 × 844 | browser local | aprovado após correção | `innerWidth=390`, `scrollWidth=375`; formulário e adicionais contidos | nenhuma |
| `rtk npm run graph:update` + consulta | staging Linux no WSL | aprovado | 439 nós, 591 relações e 47 comunidades; script e PR 9 encontrados | nenhuma |

### Incidente de validação resolvido

O primeiro smoke desta etapa recebeu `UND_ERR_SOCKET` enquanto o Compose ainda recriava API e frontend. A sondagem inicial havia alcançado containers antigos antes da substituição. `docker compose ps -a` e logs mostraram a API saudável, sem crash; após exigir estabilidade simultânea por 15 segundos, dois smokes completos passaram. A regra operacional foi incorporada ao guia.

A inspeção móvel encontrou overflow horizontal real (`scrollWidth=537` para `innerWidth=390`) causado pelo tamanho intrínseco do `<select>` e da grade de adicionais. A correção adicionou `min-width: 0`, contenção de inputs/selects, uma coluna móvel para adicionais e navegação horizontal contida. A nova medição retornou `scrollWidth=375`, e o teste 30 protege as regras CSS.

### Sequência maker/reviewer desta PR

| Papel | Estado | Impacto e evidência/handoff |
| --- | --- | --- |
| `po_processo` | aprovado | README, contexto e automações consolidam atores, jornadas e exceções; handoff para coerência processual. |
| `revisor_processo` | aprovado | requisitos funcionais rastreados no 5W2H e neste relatório, sem fluxo paralelo. |
| `arquiteto_sistema` | aprovado | arquitetura e persistência consolidadas; Graphify mostra o novo script e a PR 9. |
| `revisor_arquitetura` | aprovado | staging Graphify permanece ferramenta de desenvolvimento e não adiciona serviço de produção. |
| `dominio_db` | sem impacto | nenhuma regra, tabela, migration ou persistência alterada nesta PR; suíte existente preservada. |
| `revisor_dominio` | aprovado | 18 testes de domínio/financeiro continuam verdes e o smoke migra banco existente. |
| `backend_core` | sem impacto | API e contratos HTTP não foram modificados; build e smoke provam compatibilidade. |
| `revisor_backend` | aprovado | healthchecks, idempotência, concorrência e conflitos `409` cobertos pelo smoke. |
| `frontend_ops` | aprovado após correção | overflow móvel corrigido em CSS, filtro Pix e cinco áreas inspecionados. |
| `revisor_frontend` | aprovado | 12 testes de UI, console limpo e medições desktop/390 px. |
| `impressao_infra` | aprovado | compose completo, bridge saudável, job idempotente e script Graphify WSL reproduzível. |
| `revisor_infra` | aprovado | imagens reconstruídas, quatro serviços ativos e sem exclusão de volume. |
| `qa_validacao` | aprovado | 30/30, dois smokes verdes após estabilização, browser e grafo comprovados. |
| `revisor_final` | aprovado | reviewer distinto confirmou 30/30, Graphify 439/591/47, WSL, browser e ausência de P0/P1; nenhum arquivo foi alterado pelo revisor. |

## Decisão de release

- **Bloqueadores P0/P1:** nenhum aberto após a correção responsiva.
- **Riscos residuais aceitos:** primeiro boot/rebuild no filesystem NTFS pode ser lento; aguardar estabilidade em vez de apagar volumes. Smokes repetidos acumulam dados demonstrativos no volume local, sem afetar integridade. Impressora física não foi exercitada, embora bridge e spool tenham sido validados.
- **Verificação manual recomendada:** antes de demonstração pública, usar volume limpo ou base preparada para evitar uma fila extensa de cenários de smoke e confirmar a impressora física, se ela fizer parte da apresentação.
- **Estado:** **aprovado** pelo `revisor_final`, sem P0/P1, apto para promoção da PR de draft para pronta.
