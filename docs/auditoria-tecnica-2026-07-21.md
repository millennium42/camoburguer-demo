# Auditoria técnica integral — 2026-07-21

## Decisão executiva

O repositório está novamente executável e coerente como **demo local**, mas ainda não deve receber pedidos reais de iFood ou Delivery Much. As correções desta auditoria eliminam falhas de boot, seed, SSE, impressão e parte importante da integração, porém autenticação do painel/API, homologação com credenciais reais, impressão física e observabilidade de produção continuam como gates obrigatórios.

O deploy público observado em `https://camoburguer-ops-web.onrender.com/` corresponde ao código anterior a esta auditoria. As correções locais só chegam ao ar depois de revisão, commit, push e novo deploy.

## Escopo e método

Foram examinados:

- os 82 commits alcançáveis por todas as refs: 77 no `HEAD` e 5 apenas em refs laterais;
- o código atual de API, domínio, financeiro, frontend, bridge, simulador, scripts, testes e infraestrutura;
- os contratos e documentos operacionais obrigatórios;
- o mapa estrutural do `m1nd` e o grafo persistido do Graphify;
- a aplicação pública, de forma estritamente somente leitura;
- uma stack Docker separada, chamada `camoburguer-audit`, no Ubuntu/WSL.

A matriz individual está em [auditoria-commit-a-commit.md](auditoria-commit-a-commit.md).

### O que foi provado diretamente

- `npm test`: 36/36 testes aprovados após as correções.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas no snapshot auditado.
- Busca de padrões de segredo de alta confiança em todo `git log --all`: zero ocorrências; `.env` continua ignorado e `.env.example` passa a ser versionável.
- `npm outdated`: apenas majors opcionais (`@fastify/cors` 11 e `dotenv` 17); não foram atualizados sem migração/teste específico.
- Build Docker limpo das imagens `api`, `ops-web` e `print-bridge`.
- PostgreSQL, API e bridge saudáveis; frontend ativo.
- Seed executado em transação e resumo financeiro com `opening: 150`, sem o valor incorreto de R$ 15.000,00.
- Smoke E2E completo aprovado para quatro origens, estoque, comandas, pagamentos, caixa e spool.
- Repetição de `jobId` no bridge retorna replay sem sobrescrever o arquivo.
- `/demo/seed` sem segredo retorna `503`; bridge sem bearer retorna `401`.
- SSE local retorna `Access-Control-Allow-Origin` para a origem permitida e envia heartbeat/retry.
- Chrome contra a stack local mostrou o painel com “API conectada” e nenhum log de console.
- Graphify final foi reconstruído com 221 nós, 332 relações e 16 comunidades; a consulta de integração/impressão distinguiu corretamente `apps/print-bridge/src/server.js`.
- O deploy público anterior expunha `GET /orders` sem autenticação, mantinha o frontend em “Reconectando atualizações...” e mostrava a abertura incorreta de R$ 15.000,00.

### O que permanece inferido ou depende de terceiros

- Nenhuma credencial real ou sandbox de iFood/Delivery Much foi usada.
- Os payloads reais dos parceiros não foram capturados nem validados por teste de contrato.
- A documentação detalhada da Delivery Much é privada; as rotas do adapter precisam ser confirmadas no portal/Postman concedido ao estabelecimento.
- Nenhuma impressora térmica física, USB, serial ou TCP foi acionada.
- Não houve deploy, alteração no Render, push ou mutação em conta externa.

## Achados prioritários

| Severidade | Achado no código/deploy herdado | Evidência | Tratamento nesta auditoria | Estado |
|---|---|---|---|---|
| P0 | API operacional pública sem autenticação, com nomes, endereços e comandos de pedido | `GET /orders` público no Render | Seed agora usa identidades sintéticas; rotas destrutivas foram protegidas | **Aberto antes de dados reais**: adotar identidade de operador/BFF ou proxy autenticado |
| P0 | `/demo/seed` podia truncar dados e `/lgpd/anonymize` podia alterar PII sem autenticação | handlers públicos no servidor | `DEMO_ADMIN_TOKEN`, comparação resistente a timing e operação desabilitada sem segredo | Corrigido no repositório; requer redeploy |
| P0 | Print bridge público aceitava gravação arbitrária por `orderId/jobId`, sem limite, e revelava o caminho do spool | `join(spoolDir, input)` e health público | bearer compartilhado, IDs allowlist, limite de 64 KiB, health mínimo e caminho removido | Corrigido no repositório; requer redeploy |
| P0 | A imagem da API não iniciava: `server.js` importava `/app/scripts/seed-demo.mjs`, não copiado no Dockerfile | reprodução no Compose: `ERR_MODULE_NOT_FOUND` | Dockerfile copia `scripts`; resolução do `pg` do CLI foi tornada compatível | Corrigido e provado por build/health |
| P1 | Adapter iFood usava caminho híbrido inexistente e não enviava `x-polling-merchants` | `/order/v1.0/events:polling` | uso do módulo Events, header de merchant e intervalo mínimo de 30 s | Implementado; sandbox obrigatório |
| P1 | ACK iFood era enviado antes do commit local | ACK dentro da transação | poll persiste/processa, commit ocorre, só então `afterCommit` envia ACK | Corrigido por desenho; falta contrato real |
| P1 | Confirmação iFood abria transação aninhada que não via o pedido ainda não commitado | `activateAcceptedOrder()` iniciava outra transação | executor transacional é reutilizado | Corrigido e coberto estruturalmente |
| P1 | Ingestão externa produzia objeto incompleto para colunas obrigatórias | objeto manual sem `roundKind`, `total`, `metadata`, `updatedAt` | normalização por `createOrder()` e metadados externos estáveis | Corrigido e testado |
| P1 | Chave recebida em `Idempotency-Key` era descartada; ID externo era extraído de UUID aleatório | rota + provider | chave do cliente preservada, replay/conflito verificados e `externalOrderId` explícito | Corrigido e testado |
| P1 | Comandos podiam ficar eternamente pendentes ou ser marcados como concluídos sem ação suportada | adapters | ações allowlist por canal, retry limitado, falha visível e conclusão por evento | Corrigido parcialmente; homologar códigos de evento |
| P1 | Evento Delivery Much ganhava UUID novo em cada poll, anulando deduplicação | `randomUUID()` como ID externo | chave determinística `pedido:status` | Corrigido; validar semântica real do feed |
| P1 | SSE cross-origin não funcionava no deploy | conexão sem ACAO observada ao vivo | allowlist de CORS, cabeçalho SSE explícito, retry e heartbeat | Corrigido e provado localmente |
| P1 | Seed lançava `15000` como reais e gerava diferença de `-14850` | API pública e script | lançamento `opening` de `150.00`, seed atômico, estoque resetado e PII sintética | Corrigido e provado |
| P1 | Frontend podia renderizar texto do pedido sem escape na impressão HTML | `printOrderTicket()` | impressão duplicada client-side removida; cozinha usa apenas job do servidor | Corrigido |
| P1 | O mesmo pedido podia ser impresso pelo backend e pelo navegador | criação, preparo e reprint | removidos os disparos client-side de ticket; relatório financeiro continua local | Corrigido |
| P1 | Anonimização aceitava curingas SQL e atualizava pedidos/comandas sem atomicidade | busca `ILIKE '%termo%'` em duas conexões | busca literal por substring e transação única | Corrigido |
| P1 | Repetição de `jobId` com ticket divergente era reportada como sucesso | bridge tratava todo `EEXIST` como replay | conteúdo existente é comparado; divergência retorna `409` | Corrigido e coberto pelo smoke |
| P1 | Health da API não verificava o PostgreSQL | resposta estática `200` | `SELECT 1`; indisponibilidade do banco retorna `503` | Corrigido e coberto pelo smoke |
| P1 | HTTP para parceiros ocorre dentro da transação PostgreSQL e pode repetir um comando após rollback | `polling-runner` envolve `adapter.poll()` inteiro em transação | mantido desligado; separar claim/outbox, chamada HTTP e finalização antes de integração real | **Aberto antes de dados reais** |
| P1 | Reconciliador iFood ainda não materializa todo o catálogo (`DSP`, `CON`) e pode parar um lote em evento fora de ordem | aliases/estados tratados no adapter | fixtures reais, avanço monotônico e dead-letter fazem parte do gate de homologação | **Aberto antes de dados reais** |
| P1 | Merge deixou marcador literal e handlers duplicados | `8bcab6d`, correção parcial em `344d87e` | bloco duplicado removido e fluxo de integração unificado | Corrigido |
| P1 | Preço/nome de SKU conhecido eram aceitos do cliente | `createOrder()` | SKU conhecido usa snapshot canônico; quantidade física deve ser inteira | Corrigido e testado |
| P1 | Não existia CI | ausência de workflow | workflow com sintaxe, testes, audit, build, seed e smoke | Corrigido |
| P2 | `server.js` e `main.js` concentram responsabilidades demais | cerca de 1,2k e 1,5k linhas no baseline | não houve refatoração ampla durante correção de risco | Aberto; dividir por capacidade sem criar outro núcleo |
| P2 | DDL/migrações vivem em uma string executada no boot | `db.js` | preservado para compatibilidade da demo | Aberto; adotar migrations versionadas antes de produção |
| P2 | Rate limit é local à instância e não identifica operador | plugin em memória | preservado | Aberto; proxy/Redis e identidade antes de escala horizontal |
| P2 | Financeiro agrega hora no timezone do processo | agregação em JS | sem alteração nesta auditoria | Aberto; padronizar `America/Sao_Paulo` e testar virada de dia/DST |
| P2 | Graphify confundiu arquivos homônimos `server.js` em uma consulta anterior | `explain` retornou relações da API para a bridge | grafo reconstruído; consulta final retornou o caminho da bridge corretamente | Mitigado; continuar usando caminhos completos e confirmar no código |

## Revisão por componente

### Domínio

Pontos fortes: máquina de estados explícita, total monetário centralizado, snapshot de adicionais, ticket textual estável e invariantes de caixa puras. A correção principal foi não aceitar preço/nome adulterado para SKU conhecido e rejeitar quantidade fracionária.

Riscos: itens customizados continuam necessários para canais externos e ainda carregam preço vindo do adapter. Antes da homologação, validar moeda, arredondamento, quantidade, descontos e complementos em fixtures reais de cada parceiro.

### Persistência e financeiro

Pontos fortes: locks de linha/advisory, idempotência nas operações críticas, efeitos compensatórios e transações que unem pedido, estoque e job de impressão.

Riscos: o modelo é “append-only nos efeitos”, não em todas as tabelas. `orders`, `cash_shifts`, `service_tabs`, saldos e status recebem `UPDATE`; a documentação anterior dizia o contrário. O schema no boot dificulta rollback e revisão de migration.

### API

Pontos fortes: Fastify, Helmet, validação de domínio, transações e erro público sanitizado. Rotas administrativas agora são fechadas por padrão.

Risco bloqueador: autenticação/autorização do posto ainda não existe. CORS e rate limit não substituem controle de acesso. Não habilitar adapters reais enquanto essa fronteira estiver aberta.

### Frontend

Pontos fortes: interface estática pequena, estado efêmero, escape aplicado na maior parte da renderização e fluxo idempotente do carrinho.

Correções: handlers duplicados removidos, chaves de tentativa de integração reutilizadas, `syncStatus` escapado, SSE volta ao estado conectado e o navegador parou de imprimir o ticket que já é enviado pelo servidor.

### Integrações

O adapter iFood foi alinhado ao fluxo documentado de autenticação, polling, persistência e ACK. A documentação oficial consultada foi: [autenticação centralizada](https://developer.ifood.com.br/en-US/docs/guides/modules/authentication/centralized/), [polling do módulo Events](https://developer.ifood.com.br/en-US/docs/guides/modules/events/polling-overview/) e [eventos do módulo Order](https://developer.ifood.com.br/en-US/docs/guides/modules/order/events/).

Para Delivery Much, a referência pública disponível foi [Orientações gerais de integração](https://developer.deliverymuch.com.br/specs/orientacoes.pdf). Como os endpoints detalhados dependem de acesso privado, o adapter deve permanecer desligado até teste de contrato no ambiente concedido ao estabelecimento.

Quando o adapter Delivery Much está habilitado, a API bloqueia o cancelamento em vez de oferecer códigos demonstrativos como se fossem oficiais. Esse fluxo só deve ser liberado depois que o contrato privado definir endpoint, payload e motivos aceitos.

### Impressão e infraestrutura

O contrato de ticket não mudou. O caminho canônico é domínio → `print_jobs` → API → bridge → spool. O bridge hospedado no Render **não imprime na cozinha local**: ele apenas grava em filesystem efêmero do serviço. Impressão real exige agente local seguro ou integração ESC/POS aprovada.

O Blueprint agora gera o segredo no bridge e o referencia na API, usa hostname privado entre serviços, configura health checks, CORS restrito e headers do site estático. Conforme a [especificação oficial de Blueprints do Render](https://render.com/docs/blueprint-spec), `generateValue` e `fromService.envVarKey` evitam segredo hardcoded.

## Mudanças realizadas

- instalado `m1nd` 1.4.0 no prefixo de usuário do Ubuntu/WSL;
- removidos 11 arquivos de estado temporário que o `m1nd` criou na raiz e adicionados ao `.gitignore`;
- corrigidos Dockerfile, seed, CORS/SSE, bridge, integração, idempotência e renderização;
- adicionado `.dockerignore` para excluir `.env`, Git, caches, logs e dependências do contexto de build;
- adicionados testes de integração e segurança da bridge;
- adicionada CI reproduzível;
- CI aguarda a estabilidade do Compose antes de executar seed e smoke;
- reescrita a documentação de arquitetura, deploy, validação e desenvolvimento por IA;
- reconstruído e consultado o Graphify final;
- preservadas as alterações preexistentes que eram apenas conversão de fim de linha.

## Gates para sair de demo

1. Colocar autenticação/autorização diante de todas as rotas operacionais e SSE; registrar identidade do operador nas ações sensíveis.
2. Criar ambiente de staging e executar fixtures/sandbox iFood: token, polling, duplicata, evento fora de ordem, ACK falho, aceite, preparo, pronto e cancelamento.
3. Obter a especificação privada Delivery Much e congelar testes de contrato antes de habilitar `DELIVERYMUCH_ENABLED`.
4. Separar o poller da API web ou, no mínimo, adicionar lease/observabilidade, métricas de lag, dead-letter e reprocessamento manual.
5. Introduzir migrations versionadas, backup/PITR e teste de restore.
6. Definir o modelo real de impressão local; validar impressora física e contingência sem rede.
7. Adicionar logs de auditoria, alertas, tracing de `externalOrderId` e dashboards de erro/sincronização.
8. Executar teste de carga e concorrência com volume de jantar antes de qualquer promessa de produção.

## Veredito

- **Demo local:** aprovada após as correções e evidências desta auditoria.
- **Demo pública atual:** funcional, mas desatualizada e inadequada para dados reais.
- **Integração real:** bloqueada até autenticação e homologação dos parceiros.
- **Produção:** reprovada neste momento; os gates acima são obrigatórios.
