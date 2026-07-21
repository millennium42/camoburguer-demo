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

## PR 7 — Pagamentos múltiplos

| Pergunta | Resposta |
| --- | --- |
| What | Parcelas com métodos distintos, saldo exato em centavos, estorno append-only e encerramento somente após quitação. |
| Why | Permitir dividir o consumo real de mesas/comandas sem perder a forma de cada recebimento ou distorcer o caixa. |
| Where | PostgreSQL, agregado `service_tabs`, API, frontend de comandas, financeiro, testes e documentação. |
| When | Depois das rodadas/correções e antes do encerramento comercial; cozinha segue ciclo independente. |
| Who | Operador registra/estorna; API serializa e valida; financeiro recebe um lançamento por parcela. |
| How | `amount_cents`, lock da comanda, `Idempotency-Key`, `tab_payments` append-only e vínculo em `finance_entries`. |
| How much | Uma tabela, duas colunas de vínculo financeiro, dois endpoints, UI embutida e nenhuma dependência ou serviço novo. |

**Critérios de aceite:** R$ 100 = Pix R$ 30 + débito R$ 70, excesso 409, R$ 99,99 mantém aberta, métodos preservados, dinheiro altera caixa e estorno não apaga o original.

**Evidências:** testes de domínio/UI, migração PostgreSQL existente, smoke Docker/WSL, lançamentos por parcela e Graphify.

**Riscos:** overpayment concorrente, arredondamento e estorno duplicado. Mitigação: centavos inteiros, lock da comanda e índices únicos.

**Rollback:** bloquear novas parcelas e manter `tab_payments`/`finance_entries` para conciliação; não apagar histórico antes de zerar comandas abertas.

## PR 8 — Retirada e filtros financeiros

| Pergunta | Resposta |
| --- | --- |
| What | Expor `withdrawal` como “Retirada (sangria)” e filtrar financeiro por método e tipo. |
| Why | Tornar a retirada encontrável e impedir divergência entre lançamentos exibidos, cards e totais filtrados. |
| Where | Tela financeira, consumo dos endpoints existentes, smoke, documentação e Graphify. |
| When | Durante consulta gerencial ou movimentação de um turno aberto. |
| Who | Operador seleciona/limpa; API aplica filtros; frontend renderiza um único conjunto coerente. |
| How | `URLSearchParams` compartilhado simultaneamente por `/finance/entries` e `/finance/summary`; `withdrawal` permanece o tipo canônico. |
| How much | Dois controles, um botão de limpeza e ajustes locais de UI/testes; sem tabela, endpoint, dependência ou serviço novo. |

**Critérios de aceite:** retirada reduz caixa e não faturamento; filtro Pix mostra só Pix; combinação tipo/método recalcula lista e cards; limpar restaura o consolidado.

**Evidências:** testes DOM, suíte financeira, smoke Docker/WSL e consulta Graphify.

**Riscos:** aplicar filtro apenas na lista. Mitigação: uma string de query criada no `refreshAll` e reutilizada nos dois endpoints.

**Rollback:** remover os controles e voltar a buscar endpoints sem query; lançamentos e tipos persistidos não mudam.

## PR 9 — QA, documentação e release

| Pergunta | Resposta |
| --- | --- |
| What | Consolidar documentação, automatizar a atualização segura do Graphify no WSL, executar regressão integrada e corrigir o overflow descoberto na inspeção móvel. |
| Why | Encerrar a pilha com evidência reproduzível e impedir que um release funcional no desktop permaneça impraticável no atendimento por tela estreita. |
| Where | README, arquitetura, contexto, automações, guia, relatório, Graphify, CSS do `ops-web` e teste de regressão. |
| When | Depois de todos os incrementos funcionais e antes de promover as PRs empilhadas para revisão pronta. |
| Who | Maker consolida e executa; navegador prova a experiência; reviewer distinto decide o go/no-go; mantenedor integra a pilha na ordem. |
| How | Suíte completa, build/compose no WSL, healthchecks estáveis, smoke, inspeção desktop/390 px, correção mínima, Graphify em staging Linux e peer review final. |
| How much | Um script de desenvolvimento, uma regra CSS localizada, um teste adicional e atualização de seis documentos; sem schema, serviço, dependência ou custo financeiro novo. |

**Critérios de aceite:** 30 testes verdes; smoke completo em banco migrado; quatro containers ativos; pedidos, comandas, estoque, cozinha e financeiro inspecionados; filtro Pix coerente; viewport de 390 px sem overflow do documento; grafo atualizado e consulta nova respondida.

**Evidências:** `npm test` 30/30; Docker/WSL saudável; smoke final em 22,5 s; console do navegador sem erro/aviso; `scrollWidth` 375 em viewport de 390 px; revisão visual desktop e móvel; atualização Graphify pelo script versionado.

**Riscos:** a recriação sequencial dos containers pode deixar healthchecks antigos responderem enquanto o Compose ainda substitui a API. Mitigação: exigir todos os serviços saudáveis e estáveis por 15 segundos antes do smoke.

**Rollback:** reverter CSS/teste/script/documentos desta PR sem tocar nos dados ou nas features anteriores; se o Graphify deixar de atualizar, os artefatos da branch-base continuam utilizáveis como snapshot até nova reconstrução.
## PR 10 — Integração iFood e Delivery Much (Fase 1: Schema e Status)

| Pergunta | Resposta |
| --- | --- |
| What | Tabelas channel_mappings, channel_events, channel_commands e fluxo de estados independentes (sync_status) para canais externos. |
| Why | Isolar a máquina de estados de canais externos do núcleo de pedidos, permitindo enfileirar recebimentos sem afetar estoque ou caixa prematuramente. |
| Where | Domínio (packages/shared-types), DB (pps/api/src/db.js), configurações, API e frontend (fila de autorização). |
| When | Durante o fluxo de eventos webhook/polling dos agregadores. |
| Who | API recebe e mapeia; operador visualiza em fila de autorização; frontend dispara aceitação. |
| How | Tabela de mapeamento 1:1, status apartados (ccept_pending, etc) e botões de Aceitar/Recusar na UI segregando responsabilidade. |
| How much | 3 novas tabelas (mappings, events, commands), 1 fila visual separada no frontend. |

**Critérios de aceite:** Pedidos externos caem com status=received e não reduzem estoque nem imprimem até o aceite manual. UI possui cards destacados para aceite.

**Evidências:** Criação de tabelas validadas por testes unitários, smoke tests end-to-end simulados e exibição correta na interface.

**Riscos:** Inconsistência entre status do integrador e status interno. Mitigação: Uso de chaves idempotentes e webhook event sourcing.

**Rollback:** Desativar a flag ENABLED nas variáveis de ambiente dos canais externos; os pedidos internos não são afetados.

## PR 11 — Identidade Visual Premium (Black & Brown)

| Pergunta | Resposta |
| --- | --- |
| What | Redesign completo do frontend (ops-web) utilizando fundo negro profundo, acentos em marrom/caramelo e glassmorphism. |
| Why | Criar uma estética moderna, visualmente marcante ("wow factor") e adequada a ambientes de operação em baixa luminosidade (POS). |
| Where | CSS nativo (pps/ops-web/styles.css) e estrutura HTML (pps/ops-web/index.html). |
| When | Em todo carregamento da aplicação web. |
| Who | Usuários do caixa, balcão e gerência de operações. |
| How | Variáveis CSS remapeadas, introdução de opacidade, e emojis como micro-âncoras visuais nos formulários. |
| How much | Alteração integral do stylesheet e ajuste de responsividade com Flexbox, sem novas dependências. |

**Critérios de aceite:** UI deve parecer premium; formulários legíveis em monitores escuros; botões alinhados.

**Evidências:** Testes unitários corrigidos para mapear novos emojis, grid responsivo (lex-wrap) validado em resolução estreita.

**Riscos:** Contraste baixo para textos secundários. Mitigação: Uso de cores calculadas via HSL na raiz do CSS.

**Rollback:** Reversão do commit de CSS (styles.css); sem risco estrutural.

## PR 12 — Impressão Client-side (Cozinha e Caixas)

| Pergunta | Resposta |
| --- | --- |
| What | Impressão de tickets de cozinha e relatórios de turno (resumido e detalhado) pelo navegador. |
| Why | Permitir demonstração tátil e fluida usando janelas nativas de impressão, abandonando spooling em arquivo. |
| Where | Função printOrderTicket, printShiftReport em main.js e regras de @media print no styles.css. |
| When | Ao disparar produção da cozinha, re-impressão, ou no fechamento do caixa. |
| Who | Operador comanda a ação e escolhe a impressora térmica instalada localmente no Windows. |
| How | Injeção de HTML num <div id="print-area"> escondendo o resto da UI via CSS durante a impressão; endereço incluído dinamicamente em delivery. |
| How much | Modificação focal de frontend sem dependência externa de spoolers complexos. |

**Critérios de aceite:** Apenas o layout monocromático text-only deve ser impresso; dados cruciais obrigatoriamente preenchidos.

**Evidências:** Interceptação pelo Windows Printer Dialog; resumo financeiro contabiliza Pix, Dinheiro, Sangrias corretamente no cupom.

**Riscos:** Incompatibilidade de larguras. Mitigação: Uso de tipografia monospace clássica.

**Rollback:** Remoção das funções client-side, voltando ao endpoint de dispatchPrintJob.

## PR 13 — Documentação Central e Blueprint Render

| Pergunta | Resposta |
| --- | --- |
| What | Unificação de toda documentação técnica em guia mestre e criação do Blueprint `render.yaml` para deploy automatizado na nuvem. |
| Why | Eliminar fragmentação de documentação e habilitar deploy em 1 clique no Render PaaS para demonstrações e produção. |
| Where | `docs/DOCUMENTACAO_CENTRAL.md`, `docs/RENDER_DEPLOY.md`, `render.yaml` e `README.md`. |
| When | Após consolidação funcional completa (PRs 0-12) e antes do primeiro deploy em nuvem. |
| Who | Desenvolvedor consolida; Render provisiona automaticamente; stakeholder acessa a demo online. |
| How | Documento central com sumário executivo + diagrama Mermaid + tabelas 5W2H. Blueprint YAML com 4 serviços (DB, API, Bridge, Static). |
| How much | Três documentos novos/reescritos, um arquivo de infraestrutura como código. Sem dependência ou serviço novo. |

**Critérios de aceite:** Documentação central cobre todas as 12 PRs; `render.yaml` provisiona 4 serviços com variáveis corretas; README linkado.

**Evidências:** Deploy funcional no Render com banco provisionado automaticamente; 30 testes aprovados localmente.

**Riscos:** Divergência entre documentação e código. Mitigação: Docs gerados após implementação, revisados contra código.

**Rollback:** Reverter documentos sem afetar código funcional; `render.yaml` pode ser removido sem impactar operação local.

## PR 14 — Fluxo Contínuo de Comandas e Desconto por Rodada

| Pergunta | Resposta |
| --- | --- |
| What | Carrinho dedicado na aba de comandas com catálogo modal integrado, edição de desconto por rodada já enviada e ordenação de pedidos (ativos primeiro). |
| Why | Permitir operação contínua sem alternar entre abas; dar flexibilidade de desconto pós-envio em cenários de promoção ou erro. |
| Where | `apps/ops-web/main.js`, `apps/ops-web/index.html`, endpoints existentes de `PATCH /orders/:id/discount`. |
| When | Na operação de lançamento de rodadas e na visualização de pedidos. |
| Who | Operador lança rodada com carrinho contextual; API valida e aplica desconto. |
| How | Carrinho renderizado dentro do card da comanda ativa; modal de catálogo reutilizado; pedidos ativos ordenados acima dos finalizados. |
| How much | Alterações focais em frontend e ajuste de rate limit para 1000 req/min no modo demo. Sem nova tabela ou dependência. |

**Critérios de aceite:** Carrinho de comanda funcional com catálogo; desconto editável em rodada já enviada; pedidos ordenados por status.

**Evidências:** Operação completa de comanda com rodadas consecutivas; testes visuais de ordenação; 30 testes aprovados.

**Riscos:** Conflito de merge com HTML em andamento. Mitigação: Remoção de marcadores de conflito e teste manual.

**Rollback:** Reverter commits de frontend; funcionalidade de rodada permanece pela API sem o carrinho contextual.

## PR 15 — LGPD, Segurança e Hardening

| Pergunta | Resposta |
| --- | --- |
| What | Rota `/lgpd/anonymize` para anonimização de PII, headers de segurança via `@fastify/helmet` e rate limiting via `@fastify/rate-limit`. |
| Why | Atender requisitos de Lei Geral de Proteção de Dados e proteger a API contra abuso em ambiente público. |
| Where | `apps/api/src/server.js`, `apps/api/package.json`. |
| When | Em toda requisição HTTP (helmet/rate-limit) e sob demanda (anonimização). |
| Who | API aplica proteções automaticamente; operador/DPO executa anonimização quando necessário. |
| How | Plugins Fastify nativos registrados no boot; rota POST que substitui campos PII por hashes no banco. |
| How much | Três dependências de produção (`@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`), uma rota nova. |

**Critérios de aceite:** Headers de segurança presentes nas respostas; rate limit ativo com resposta 429 após exceder; anonimização substitui nomes e endereços.

**Evidências:** Teste de headers via DevTools; rate limit confirmado com requisições em sequência; campos anonimizados no banco.

**Riscos:** Rate limit muito baixo para operação real. Mitigação: Configurável por variável de ambiente; 1000 req/min no modo demo.

**Rollback:** Remover registro dos plugins; rota de anonimização pode permanecer inerte sem afetar operação.

## PR 16 — Refatoração UI: Catálogo por Abas e Configuração Modal

| Pergunta | Resposta |
| --- | --- |
| What | Interface do catálogo reorganizada em abas por categoria com modal de adicionais/desconto e compatibilidade retroativa (remoção de `Object.groupBy`). |
| Why | Melhorar a navegação em catálogos grandes (51 itens) e garantir funcionamento em navegadores mais antigos. |
| Where | `apps/ops-web/main.js`, `apps/ops-web/index.html`. |
| When | Na seleção de produtos para adicionar ao carrinho. |
| Who | Operador navega entre categorias; modal permite personalização antes de adicionar. |
| How | Tabs HTML nativas com event delegation; `reduce` manual substituindo `Object.groupBy`; modal `<dialog>` nativo. |
| How much | Refatoração focal de frontend; cache bust via query string no `main.js`. Sem nova dependência. |

**Critérios de aceite:** Catálogo agrupado por categorias com abas clicáveis; modal funcional com adicionais, desconto e observação; compatível com Chrome 110+.

**Evidências:** Operação testada em Chrome e Edge; `Object.groupBy` removido; cache invalidado.

**Riscos:** Event delegation pode conflitar com handlers existentes. Mitigação: Bubbling controlado com `closest()`.

**Rollback:** Reverter para listagem plana do catálogo sem abas; funcionalidade de pedido permanece intacta.

## PR 17 — Correção de Render.yaml e Auto-Seed

| Pergunta | Resposta |
| --- | --- |
| What | Correção da chave do PostgreSQL no `render.yaml` (de `services` para `databases` na raiz), adição de auto-seed no boot da API e health check na rota `/`. |
| Why | O Blueprint não provisionava o banco corretamente; o banco no Render ficava vazio sem dados de demonstração; o Render requer health check na rota raiz. |
| Where | `render.yaml`, `apps/api/src/server.js`. |
| When | No deploy via Render Blueprint e no boot da API. |
| Who | Render provisiona DB via Blueprint; API detecta banco vazio e executa seed automaticamente. |
| How | Chave `databases` movida para raiz do YAML; flag `AUTO_SEED=true` ativa seed no boot; `GET /` retorna `{ status: "ok" }`. |
| How much | Correções mínimas em 2 arquivos; sem nova dependência. |

**Critérios de aceite:** Blueprint provisiona banco PostgreSQL corretamente; API sobe com seed automático; health check na raiz retorna 200.

**Evidências:** Logs do Render confirmam `Banco de dados vazio detectado. Executando seed de demonstração automaticamente...`; `GET /` retorna 200.

**Riscos:** Seed duplicado em restart. Mitigação: Seed só executa se `SELECT COUNT(*) FROM orders = 0`.

**Rollback:** Remover flag `AUTO_SEED`; seed manual via `scripts/seed-demo.mjs` com `DATABASE_URL`.

## PR 18 — Correção de apiBase para Deploy Render

| Pergunta | Resposta |
| --- | --- |
| What | Correção da lógica de `apiBase` no frontend para apontar para o subdomínio correto da API no Render (`camoburguer-api.onrender.com`) em vez do site estático. |
| Why | O frontend em produção tentava chamar a API no mesmo hostname do site estático (ops-web), resultando em 404 "Not Found" em todas as rotas. |
| Where | `apps/ops-web/main.js`, constante `apiBase`. |
| When | No carregamento da SPA em ambiente de produção no Render. |
| Who | Frontend detecta automaticamente o ambiente e ajusta a URL. |
| How | Substituição dinâmica: `hostname.replace('ops-web', 'api')` para produção; `:3001` mantido para localhost. |
| How much | Alteração de 3 linhas em 1 arquivo. Sem dependência nova. |

**Critérios de aceite:** `apiBase` resolve para `https://camoburguer-api.onrender.com` em produção e `http://localhost:3001` localmente; todas as chamadas retornam 200.

**Evidências:** Logs do Render mostram requisições bem-sucedidas na API; frontend conecta e exibe "API conectada".

**Riscos:** Hostnames de Render customizados não seguem o padrão `ops-web`/`api`. Mitigação: Funciona com o naming padrão do Blueprint; domínios customizados precisariam de variável de ambiente.

**Rollback:** Reverter para URL hardcoded; configurar `API_BASE_URL` como variável de ambiente se necessário.

