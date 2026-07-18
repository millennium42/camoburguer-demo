# Registro 5W2H da Evolução Operacional

Este documento usa What, Why, Where, When, Who, How e How much como registro decisório vivo. “How much” mede superfície técnica e operacional; nenhum custo financeiro é inventado.

## PR 0 — Descontos por item e pedido

| Pergunta | Resposta |
| --- | --- |
| What | Descontos percentuais digitáveis de 0 a 100 por item e no total do pedido. |
| Why | Permitir promoções explícitas sem alterar preços do catálogo ou calcular valores fora do domínio. |
| Where | Domínio, tabela `orders`, API, formulário operacional, testes e ciclos de pedido/financeiro. |
| When | No cálculo do carrinho e na criação imutável do pedido. |
| Who | Operador informa; domínio valida; API persiste; revisor prova limites e total. |
| How | Desconto da linha antes do desconto geral, ambos normalizados e limitados por validação e constraint. |
| How much | Uma coluna aditiva, dois campos nativos, nenhum serviço ou dependência nova. |

**Critérios de aceite:** campos visíveis de 0 a 100; desconto da linha calculado antes do geral; valores inválidos rejeitados; persistência e reload preservados.

**Evidências:** 13 testes automatizados aprovados; `calculateOrderTotal()` ligado a `normalizeDiscountPercent()` no grafo; revisão peer-to-peer sem P0/P1.

**Riscos:** arredondamento monetário e divergência entre frontend e domínio. Mitigação: domínio como fonte final e normalização compartilhada.

**Rollback:** ocultar os campos e manter percentuais em zero; a coluna aditiva permanece sem exigir perda ou reescrita de dados.

## PR 1 — Guia de desenvolvimento, 5W2H e Graphify

| Pergunta | Resposta |
| --- | --- |
| What | Guia único de desenvolvimento, registro 5W2H, comandos WSL e fluxo RAG/cache. |
| Why | Tornar a evolução reproduzível, reduzir contexto repetido e eliminar a falha do Graphify no host Windows. |
| Where | Documentação raiz, scripts npm e relatório de validação. |
| When | Antes das features de catálogo, comandas, estoque e pagamentos. |
| Who | Orquestrador mantém; makers aplicam; reviewers verificam evidências. |
| How | Prefixo estável de prompt, recuperação m1nd/Graphify e execução do Graphify pelo runtime Linux do WSL. |
| How much | Dois documentos novos, pequenos ajustes em README/package e nenhuma dependência de produção. |

**Critérios de aceite:** comandos executáveis no host; Graphify atualizado pelo WSL; guia cobre Git, testes, review e rollback; toda PR recebe 5W2H completo.

**Evidências:** 13 testes aprovados; `npm run graph:update` concluído no Ubuntu; grafo JSON válido com 374 nós e 474 arestas; consulta estrutural respondida.

**Riscos:** Graphify ausente no WSL e interpretação incorreta de `built_at_commit`. Mitigação: pré-requisito/probe explícito e freshness composta por manifesto, consulta e árvore limpa.

**Rollback:** restaurar scripts npm anteriores; documentos continuam válidos como histórico sem afetar aplicação ou banco.

## Próximos incrementos

Cada PR adicionará aqui sua tabela 5W2H concluída, critérios de aceite, evidências, riscos e rollback antes do commit final.

## PR 2 — Cardápio OlaClick

| Pergunta | Resposta |
| --- | --- |
| What | Snapshot estático do cardápio público, com categorias, preços, disponibilidade e mapeamento de estoque. |
| Why | Evitar preços fictícios na operação e manter a demo alinhada à oferta atual. |
| Where | Pacote de domínio, endpoint `/catalog`, seletor do frontend e testes. |
| When | Carregado na abertura da operação; atualização futura exige novo snapshot versionado. |
| Who | Fonte pública fornece; domínio versiona; API entrega; operador seleciona apenas disponíveis. |
| How | Lista local capturada em 2026-07-16, agrupada por `optgroup`, sem scraper ou chamada externa em runtime. |
| How much | Um arquivo de dados, pequenos ajustes em três consumidores e nenhuma dependência nova. |

**Critérios de aceite:** 51 registros, 50 disponíveis, “Produto 19” bloqueado no frontend e domínio, snapshot integral protegido por hash e origem/data verificáveis.

**Evidências:** teste de contrato e hash do catálogo, rejeição do indisponível, cobertura de optgroup/esgotado, consulta Graphify e endpoint `/catalog` no smoke integrado.

**Riscos:** mudança posterior do menu público. Mitigação: `capturedAt` e URL explícitos; nova captura entra por PR própria.

**Rollback:** restaurar o catálogo anterior sem migração de banco; pedidos existentes preservam seus próprios snapshots.
