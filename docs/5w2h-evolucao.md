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

## PR 3 — Adicionais do cardápio

| Pergunta | Resposta |
| --- | --- |
| What | Dezessete adicionais selecionáveis para Lanches, Xis e Dogs, com snapshot e preço. |
| Why | Permitir personalização cobrada sem depender de texto livre ou alterar o produto-base. |
| Where | Catálogo/domínio, `/catalog`, carrinho, pedido, ticket e testes. |
| When | Selecionados antes de adicionar ao rascunho e congelados ao criar o pedido. |
| Who | Operador escolhe; domínio valida/preça; cozinha recebe; financeiro reconhece no total. |
| How | Checkboxes nativos, SKU único por adicional e cálculo por unidade antes dos descontos. |
| How much | Uma lista estática e alterações localizadas, sem tabela, serviço ou dependência nova. |

**Critérios de aceite:** múltiplos adicionais distintos, bloqueio de duplicado/inválido, bebidas sem adicionais, total correto e ticket legível.

**Evidências:** hash dos 17 adicionais, testes de domínio/UI, `/catalog`, Graphify atualizado e smoke integrado.

**Riscos:** combinações visualmente iguais acumuladas de forma indevida. Mitigação: chave do carrinho inclui SKUs dos adicionais.

**Rollback:** ocultar checkboxes e rejeitar arrays novos; pedidos existentes preservam snapshots e totais já calculados.

## PR 4 — Comandas livres

| Pergunta | Resposta |
| --- | --- |
| What | Comandas ou mesas abertas por identificador livre, com rodadas vinculadas ao núcleo de pedidos. |
| Why | Atender consumo local sem misturar rascunho comercial com canais externos ou exigir mapa fixo. |
| Where | PostgreSQL, API `/tabs`, carrinho existente, tela Comandas, ticket e testes. |
| When | Comanda abre antes do consumo; cada envio cria a próxima rodada sequencial. |
| Who | Operador abre/seleciona; API serializa; domínio cria pedido; cozinha recebe ticket. |
| How | `service_tabs`, vínculo opcional em `orders`, índice de identificador aberto e Idempotency-Key. |
| How much | Uma tabela, duas colunas em pedidos e reaproveitamento integral do formulário atual. |

**Critérios de aceite:** identificador livre único entre abertas, tab/mesa, rodada idempotente, total agregado e canais externos inalterados.

**Evidências:** testes de domínio/UI, smoke de abrir/lançar/repetir/consultar, Graphify e suíte completa.

**Riscos:** dois terminais criarem a mesma rodada. Mitigação: lock da comanda, índice `(tab_id, round_number)` e chave idempotente.

**Rollback:** desabilitar rotas/tela; pedidos já vinculados continuam pedidos válidos e o vínculo aditivo pode permanecer.

## PR 5 — Rodadas e tickets corretivos

| Pergunta | Resposta |
| --- | --- |
| What | Cancelamento parcial/total de itens enviados por nova rodada negativa e ticket corretivo. |
| Why | Permitir editar uma comanda em andamento sem reescrever a informação já recebida pela cozinha. |
| Where | `orders`, domínio, endpoint de cancelamento, telas Comandas/Cozinha, ticket e testes. |
| When | Após o envio; antes do envio a edição continua ocorrendo no carrinho. |
| Who | Operador solicita; API valida saldo cancelável; cozinha executa o ticket corretivo. |
| How | IDs estáveis por linha, referência à rodada original, lock, Idempotency-Key e total negativo. |
| How much | Duas colunas em `orders`, uma rota, um diálogo e nenhuma tabela/serviço adicional. |

**Critérios de aceite:** original imutável, parcial limitado ao restante, retry sem duplicar, total da comanda compensado e cozinha destacada.

**Evidências:** testes de domínio/UI, smoke de criar/repetir/consultar/fechar, spool e Graphify.

**Riscos:** cancelamento exceder quantidade original. Mitigação: soma transacional dos corretivos existentes sob lock da comanda.

**Rollback:** desabilitar nova rota; corretivos existentes continuam pedidos auditáveis e seus totais permanecem no agregado.

## PR 6 — Estoque por categoria

| Pergunta | Resposta |
| --- | --- |
| What | Saldos e movimentações auditáveis de Xis, Dog e Hambúrguer. |
| Why | Baixar automaticamente o que foi enviado à cozinha e impedir venda sem unidade disponível. |
| Where | PostgreSQL, domínio, criação/cancelamento de pedidos, `/inventory`, frontend e smoke. |
| When | Baixa na confirmação; restituição só em cancelamento anterior ao preparo; ajuste manual a qualquer momento autorizado. |
| Who | Operador inicializa/ajusta; API bloqueia e movimenta; domínio agrega categorias. |
| How | Locks por categoria, transação única, constraints e efeitos idempotentes append-only. |
| How much | Duas tabelas, uma tela/rota de ajuste e nenhuma gestão de ingredientes ou dependência nova. |

**Critérios de aceite:** zero inicial, `5-2=3` uma vez, insuficiência 409, reversão antes do preparo, ausência de reversão depois e motivo obrigatório.

**Evidências:** testes de agregação/UI, smoke com carga/retry/baixa/insuficiência/reversões, Docker WSL e Graphify.

**Riscos:** deadlock entre categorias e dupla baixa. Mitigação: ordem alfabética de locks e unicidade por efeito.

**Rollback:** bloquear novos itens controlados ou desabilitar a baixa; saldos/movimentos existentes permanecem para auditoria.
