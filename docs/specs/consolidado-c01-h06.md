# Consolidação de Especificações (Fase de Integridade: C-01 a H-06)

Este documento reúne todas as especificações técnicas, escopos, restrições e rubricas das correções aplicadas na fase de integridade.

---

## Corrigir escalada de privilégio da função kitchen (C-01)

### Objetivo

Garantir que o papel `kitchen` receba acesso estrito e exclusivo à autorização das operações estritamente necessárias ao preparo dos pedidos (`orders:prepare`), removendo sua equivalência involuntária com a permissão genérica `orders`, eliminando qualquer decisão de autorização fundamentada em parâmetros ou campos no corpo (body) da requisição e assegurando a validação de transições de status diretamente na rota competente, preservando ao mesmo tempo a negação por padrão (`default-deny`) e os acessos operacionais legítimos de `operator` e `admin`.

### Escopo
#### Incluído
- Alteração da lógica na função `hasPermission()` (no arquivo `apps/api/src/auth.js`) para impedir que a posse de `orders:prepare` outorgue ou satisfaça a permissão genérica `orders`.
- Classificação explícita do endpoint de atualização de status de pedidos na função `permissionForRequest()` (`PATCH /orders/:orderId/status`) como requisitando a permissão `orders:prepare`, preservando as permissões exclusivas para endpoints de desconto, criação, cancelamento, vinculação de comanda e reimpressão.
- Extinção total no hook de autorização (`preHandler` no arquivo `apps/api/src/server.js`) de qualquer condicional que examine atributos do payload ou do corpo das requisições web para autorizar o acesso à rota.
- Validação robusta e transacional nas camadas competentes e no handler de `PATCH /orders/:orderId/status` de modo que sessões do papel `kitchen` operem de maneira permitida em rigorosas transições: unicamente `confirmed → in_preparation` e `in_preparation → ready` (juntamente com retentativas idempotentes idênticas e seguras).
- Suporte a testes determinísticos, tanto em nível de unidade para a matriz RBAC e regras de transição quanto com verificação real por chamadas HTTP, englobando transporte de sessões, verificação de cookies e segurança por tokens CSRF.

#### Fora do escopo
- Modificação de esquemas ou migrações destrutivas na base PostgreSQL em deploy no servidor.
- Alteração nos fluxos de negócio gerais dos papéis `operator` ou `admin` que independem do abuso identificado para o papel da cozinha.

### Requisitos exatos
- REQ-001: A função `hasPermission(role, permission)` não deve em hipótese alguma outorgar ou autorizar a permissão genérica `orders` ao papel `kitchen` com base na permissão de preparo; especificamente, `hasPermission("kitchen", "orders")` precisará retornar `false`.
- REQ-002: O seletor de rotas `permissionForRequest(method, path)` tem que designar estritamente o par `PATCH /orders/:orderId/status` ao requisito de autorização `orders:prepare`, conservando rotas como `PATCH /orders/:orderId/discount`, `POST /orders/:orderId/tab-assignment`, `POST /orders`, `POST /orders/:orderId/reprint`, entre outras rotas operacionais, com seus requisitos nativos autorizados (como `orders`, `admin` ou `print:read`).
- REQ-003: O middleware e o hook global do servidor web (`preHandler` em `server.js`) não examinarão nem tomarão decisões de permissão inspecionando chaves do corpo das requisições submetidas pelo cliente (ex: remoção completa da inspeção por `request.body?.status` como exceção autorizável).
- REQ-004: O processador da rota `PATCH /orders/:orderId/status` deverá recusar sumariamente com status HTTP `403` e corpo `{ error: "Permissao insuficiente" }` se um usuário logado como `kitchen` solicitar qualquer transição fora das combinatórias permitidas `confirmed → in_preparation` e `in_preparation → ready` (com exceção de repetições estritamente idempotentes de estado idêntico para esses destinos admitidos).
- REQ-005: Sessões associadas aos papéis `operator` e `admin` reterão intocados os seus respectivos acessos plenos aos endpoints sob jurisdição operacional autorizada nas tabelas centrais do RBAC.

### Restrições
- CON-001: A segurança institucional exigida na erradicação desse exploit deve residir determinística e autonomamente no backend NodeJS/Fastify, inadmitindo delegação puramente ao front-end ou dependência implícita na engine do banco de dados relacional.
- CON-002: A verificação centralizada de roteamento exigirá "negação por padrão" (`default-deny`), retornando inegociáveis respostas HTTP `401` ({ error: "Rota nao classificada" }) no pré-processador caso depare-se com rota ausente de categorização explícita na matriz.
- CON-003: Mutações HTTP sob rotas autenticadas exigirão compulsoriedade e validação satisfatória do token de verificação CSRF previamente à alteração documental no sistema.

### Casos extremos e falhas
- EDGE-001: Operador logado como `kitchen` emite chamada forjada a `PATCH /orders/:id/discount` carregando em seu body o payload malicioso `{ status: "ready", discountPercent: 15 }`; como resultado do isolamento de payload e supressão da equivalência genérica em `hasPermission`, a infraestrutura bloqueará com resposta HTTP `403` sem processar cálculos da rota.
- EDGE-002: Autenticado sob papel `kitchen` aciona `PATCH /orders/:id/status` requisitando mutação de estado direto para `"cancelled"` ou `"completed"`; a rotina identificadora da transição repudiará o pedido com HTTP `403` sem alterar o status na base de dados.
- EDGE-003: Uma retentativa idempotente disparada por `kitchen` sobre um pedido que já consta em banco sob os estados `"in_preparation"` ou `"ready"`, pleiteando confirmação de transição para este idêntico estado consentido ao seu papel, será respondida civilmente por reavaliação idempotente sem disparar alarme artificial de exceção de segurança.
- EDGE-004: Acesso de clientes `kitchen` ou `operator` rumo a rotas não catalogadas recebem inexorável rejeição com retorno HTTP `401` informando ausência de classificação de segurança para a rota pretendida.

### Definição de concluído
- DONE-001: Exames unitários e analíticos em `tests/auth.test.js` ou análogos provam que a consulta `hasPermission("kitchen", "orders")` retorna incondicionalmente `false`.
- DONE-002: Bateria unitária em suíte de teste verifica sistemática e detalhadamente que o avaliador da transição aprova ordens sob gestão da cozinha excepcionalmente e exclusivamente sob a progressão `confirmed → in_preparation` ou `in_preparation → ready` (além das retentativas legítimas correspondentes), banindo mutações divergentes.
- DONE-003: Validações HTTP autossuficientes — injetadas de ponta a ponta munidas com instâncias reais da sessão autorizável em cookie e de cabeçalhos legítimos com token de validação CSRF — provam perante suíte de testes que chamadores do tipo `kitchen` recebem retorno inegociável HTTP `403` nas tentativas abusivas do tipo exploit contra aplicação de desconto forjado por inserção paralela do atributo `status`.
- DONE-004: Validações HTTP demonstrativas em suíte de testes garantem o repúdio com HTTP `403` perante tentativas por chamadores do grupo `kitchen` na criação de pedidos, solicitação de cancelamento, atribuição/vínculo a comandas, reimpressão ou invocação de endpoints de supervisão administrativa do catálogo na API.
- DONE-005: Suítes de validação de qualidade sintática, checagens contínuas da base e baterias de verificação de testes são bem-sucedidas no encerramento (`npm test`, `npm run check` e conformidade de sintaxe apurada sem resíduos por `git diff --check`).


---

## H-01 — Impedir criação avulsa de rodadas e cancelamentos forjados

### 1. Problema e Evidências

A rota `POST /orders`, responsável pelo cadastro de pedidos avulsos (balcão, telefone, WhatsApp), repassa integralmente o payload JSON recebido (`request.body`) para a função de domínio `createOrder()` no módulo do servidor, mesclado apenas à chave de idempotência.
Por negligenciar uma verificação restritiva (allowlist de DTO comercial) na entrada da API de pedidos, atributos puramente estruturais e internos — especificamente `tabId` (vínculo com comanda aberta), `roundNumber` (número da rodada na comanda), `roundKind` (natureza do pedido, como `production` ou `cancellation`) e `reversesOrderId` (vínculo com pedido que está sendo anulado ou estornado) — podem ser injetados por clientes externos diretamente na requisição avulsa.

**Evidência de código anterior:**
Em `apps/api/src/server.js`, no handler `app.post("/orders")`:
```javascript
// O payload idempotente e a criação confiam diretamente no objeto bruto do request.body
const requestFingerprint = fingerprint(orderFingerprintPayload(request.body || {}));
// ...
const order = confirmOrder(createOrder(
  { ...(request.body || {}), idempotencyKey },
  { catalog }
));
```

A ausência de saneamento permitia que um atacante ou cliente com erro na integração forjasse cancelamentos e vínculos com comandas existentes sem passar pelas rotas dedicadas de rodadas (`POST /tabs/:tabId/rounds`) e cancelamento/correção (`POST /orders/:orderId/cancel` ou endpoints de itens da comanda), burla que resulta em contabilização comercial falha, saldos incorretos, distorções de estoque e registros inválidos no banco sem a devida conciliação com a situação da comanda e itens elegíveis.

### 2. Comportamento Atual e Comportamento Desejado

- **Comportamento Atual (Incorreto):** O endpoint `POST /orders` acata sem repúdio atributos reservados, possibilitando ao chamador definir arbitrariamente identificadores de rodadas (`roundNumber`, `roundKind="cancellation"`), vincular pedidos avulsos a comandas sem a verificação transacional de abertura (`tabId`) ou emular uma transação compensatória de estorno sem reconciliação (`reversesOrderId`). Adicionalmente, campos avulsos e anômalos fora do modelo conceitual são consumidos, alterando fingerprints idempotentes ou sendo transacionados pelo banco implicitamente.
- **Comportamento Desejado (Correto):** O servidor deve impor um **DTO explícito** para chamadas dirigidas a `POST /orders`, rejeitando sumariamente (via HTTP `400 Bad Request` na verificação preliminar, antes de qualquer requisição ao banco de dados ou trava de idempotência) a incidência dos campos estruturais reservados (`tabId`, `roundNumber`, `roundKind`, `reversesOrderId`). Adicionalmente, deve se blindar contra quaisquer propriedades alheias ao escopo comercial canônico (negação de propriedades desconhecidas por allowlist). Quando um pedido avulso é aceito e normalizado, o sistema forçar soberanamente em sua estrutura persistida os defaults invioláveis: `tabId: null`, `roundNumber: null`, `roundKind: "production"` e `reversesOrderId: null`.

### 3. Invariantes de Domínio e Segurança

1. **Invariante de Fechamento de Canal Avulso:** Criações iniciadas por `POST /orders` são invariavelmente pedidos autônomos, de rodada produtiva padrão e não vinculáveis de origem a comandas nem atribuídos como reversões financeiras ou corretivas.
2. **Invariante de Rotas Dedicadas:** Inserções de rodadas consumidas nas comandas ocorrem estritamente pela via autenticada de `POST /tabs/:tabId/rounds` (que impõe locks de comanda aberta). Compensações, estornos e rodadas corretivas decorrem exclusivamente das lógicas autoritativas e homologadas de cancelamento (como `createCancellationOrder()`).
3. **Invariante de Isolamento Idempotente Transacional:** Tentativas rejeitadas na borda do protocolo por infração ao DTO de pedidos avulsos jamais alocam registros na tabela `idempotency_records`, tampouco reduzem o saldo na tabela de almoxarifado (`stock_movements`) ou geram spools na fila de impressão de tickets (`print_jobs`).
4. **Invariante de Estabilidade do Fingerprint:** O cálculo criptográfico do fingerprint em SHA-256 (em `idempotency.js`) espelha perfeitamente as definições canônicas do DTO e consolida todos os atributos estruturais (incluindo `roundKind` e `roundNumber` quando determinísticos) e comerciais normalizados antes da gravação na base relacional.

### 4. Estados e Transições Afetados

A mitigação assegura o ciclo de vida comercial padrão (`received → confirmed → ready` para modos como `direct_handoff`, ou `confirmed` para produção na cozinha). Ao restringir modificações no atributo `roundKind` (forçando `production` no avulso) e vetar referências à reversão (`reversesOrderId`), garante-se que nenhum pedido nasça mascarado em estado corretivo ou altere de forma ilícita transições dependentes da máquina de estados do módulo operacional.

### 5. Contratos HTTP e de Persistência Afetados

- **Endpoint alterado:** `POST /orders` (criação de pedido avulso no balcão / autoatendimento).
- **Lista de permissões autorizadas para o DTO de criação avulsa:** `items`, `source`, `customerName`, `fulfillmentMode`, `deliveryAddress`, `promisedAt`, `paymentMethod`, `discountPercent`, `notes`, `priority`, `channelLabel`, `metadata`, `idempotencyKey` (com suporte retrocompatível a passagens em testes legados que envolvam `id` ou `createdAt` se aplicável).
- **Lista de bloqueio e repúdio HTTP 400 (Campos Estruturais):** `tabId`, `roundNumber`, `roundKind`, `reversesOrderId`.
- **Formato do Retorno de Erro 400:**
  ```json
  {
    "code": "STRUCTURAL_FIELDS_FORBIDDEN",
    "message": "Campos estruturais como tabId, roundNumber, roundKind e reversesOrderId não são permitidos na criação avulsa"
  }
  ```
- No caso de injeção de campos desconhecidos (falsificação ou erro no cliente), retorna-se HTTP 400:
  ```json
  {
    "code": "UNKNOWN_FIELD",
    "message": "Campo não permitido no DTO de pedido avulso: <nome_do_campo>"
  }
  ```

### 6. Estratégia de Migração e Compatibilidade

A alteração em `POST /orders` é perfeitamente retrocompatível com a totalidade dos clientes bem comportados do sistema (`apps/ops-web/main.js`, scripts de demonstração, simuladores transacionais e relatórios de fluxo). Nenhuma modificação no esquema de tabelas no PostgreSQL é necessária nem alteração em rotas de comanda, mantendo 100% de estabilidade com ordens legadas na base.

### 7. Arquivos e Símbolos Prováveis

- **`packages/domain/index.js`**:
  - Introdução da constante exportada `RESERVED_STANDALONE_ORDER_FIELDS` (conjunto dos 4 campos estruturais vetados no avulso).
  - Introdução da constante exportada `ALLOWED_STANDALONE_ORDER_FIELDS` (allowlist rigorosa dos campos de DTO permitidos e seguros para pedidos avulsos).
  - Introdução da função canônica exportada `normalizeStandaloneOrderDto(body)` que realiza a inspeção, lança erros com códigos adequados em caso de violação e devolve um objeto purificado garantindo explicitamente os valores padrão `tabId: null`, `roundNumber: null`, `roundKind: "production"` e `reversesOrderId: null`.
- **`apps/api/src/idempotency.js`**:
  - Ajuste na função `orderFingerprintPayload(body = {}, overrides = {})` para incorporar de modo estável no hash SHA-256 os atributos `roundNumber: value.roundNumber == null ? null : Number(value.roundNumber)` e `roundKind: String(value.roundKind || "production")`, assegurando coerência criptográfica integral de representação com o que o banco registra de fato.
- **`apps/api/src/server.js`**:
  - Importação e engaste de `normalizeStandaloneOrderDto(request.body)` como porta de verificação limiar na rota `POST /orders`, antecedendo imediatamente o cálculo do fingerprint e a abertura de transação do PostgreSQL.
- **`tests/h01-orders-dto.test.js`** (Novo):
  - Bateria exaustiva e automatizada comprovando o bloqueio individual e combinado de todos os campos estruturais no endpoint `POST /orders`, a garantia de zero efeitos na base rechaçada, bem como o fluxo contínuo de rodadas por rotas próprias, simulações de replay idempotente e integridade de concorrência.

### 8. Estratégia de Testes e Plano de Regressão

1. **Testes HTTP de Bloqueio Estrutural (Isolados e em Combo):** Verificações independentes via `app.inject` na API injetando isoladamente: `tabId: "uuid"`, `roundNumber: 2`, `roundKind: "cancellation"`, `reversesOrderId: "uuid"`, bem como requisições englobando todos em simultâneo. Em todos os casos, afirmação estrita de resposta HTTP `400` com código `STRUCTURAL_FIELDS_FORBIDDEN`.
2. **Teste de Rejeição de Propriedades Desconhecidas:** Verificação submetendo atributos anômalos ilegítimos (e.g., `forgedAdminBonus: 1000`, `bypassStock: true`), constatando retorno HTTP `400` com código `UNKNOWN_FIELD`.
3. **Teste de Ausência de Efeitos Mutações no Banco (Idempotência, Almoxarifado e Ticket):** Comprovar consultando as tabelas e memórias logo após as rejeições, provando que o estoque do SKU não sofreu decremento, nenhum ticket de cozinha gerou spool e não houve inserção em `idempotency_records`.
4. **Teste de Pedido Avulso Legítimo + Regressão Compatível:** Verificação transacional atestando criação plena com retorno HTTP `201`, na qual o servidor enxerta limpidamente `tabId: null`, `roundNumber: null`, `roundKind: "production"` e `reversesOrderId: null`.
5. **Teste de Rodada Legítima por Rota Dedicada:** Acionar `POST /tabs/:tabId/rounds` confirmando que a inclusão operacional de rodadas permanece operando fluidamente com numeração incremental soberana calculada em lock transacional do servidor e sem conflito de fingerprint.
6. **Teste de Replay Idempotente sob DTO Normalizado:** Enviar requisições repetidas portando o mesmo `Idempotency-Key` e acurácia comercial com campos ordenados analogamente para atestar compatibilidade contínua entre payloads saneados e fingerprints gravados.
7. **Regressão Institucional Completa:** Acionamento íntegro e irrestrito da suíte `npm test` e verificação de sintaxe para validar estabilidade transversal.

### 9. Observabilidade e Mensagens de Erro

- Falhas no saneamento na borda reportam erros informativos com semântica acionável para programadores e integradores sem vazar estruturas de SQL ou stack trace em produção:
  - `400 Bad Request`: `{ code: "STRUCTURAL_FIELDS_FORBIDDEN", message: "..." }`
  - `400 Bad Request`: `{ code: "UNKNOWN_FIELD", message: "..." }`
- Rejeições de provedores externos (`ifood`, `deliverymuch`) são preservadas na íntegra com a semântica existente (`EXTERNAL_SOURCE_REQUIRES_ADAPTER`).

### 10. Riscos, Rollback e Itens Fora de Escopo

- **Riscos e Mitigações:** O risco primário reside em bloquear equivocadamente propriedades legítimas utilizadas pelas interfaces ou testes existentes. Esse risco foi completamente suprimido pela varredura via `grep_search` pelo código fonte e inspeção de testes legados e front-end web, construindo uma allowlist comercial exata de 15 propriedades (incluindo chaves de suporte do catálogo e rastreio de seed como `id` e `createdAt`).
- **Procedimento de Rollback:** Em eventualidade imprecisa, a alteração se reverte pelo comando padrão de versionamento Git sem corromper nenhuma tabela de banco relacional, pois não realizamos alterações destrutivas em DDL ou migrations de base.
- **Fora do Escopo (Não Fazer):** Não alterar o formato externo das rotas de comanda em `server.js` nem empreender refatorações extensas na engine do domínio; a missão limita-se puramente a erradicar o bypass na criação avulsa e declarar o contrato estrito no DTO e idempotência.

### 11. Critérios de Aceitação Verificáveis

- [ ] Payload avulso válido submetido via HTTP POST `/orders` cria o pedido comercial perfeitamente e é sancionado com HTTP `201`.
- [ ] Presença de qualquer um dos campos reservados (`tabId`, `roundNumber`, `roundKind`, `reversesOrderId`) na rota HTTP `POST /orders` devolve invariavelmente HTTP `400` com código `STRUCTURAL_FIELDS_FORBIDDEN`.
- [ ] Atribuição ilícita de propriedades desconhecidas em `POST /orders` retorna imediatamente HTTP `400` (`UNKNOWN_FIELD`).
- [ ] Não há mutação detectada no estoque (`stock_movements`), criação de ordens, reserva de impressão (`print_jobs`) ou registros vinculados a chamadas na tabela `idempotency_records` perante payload refutado na borda.
- [ ] Rotas de rodada na comanda (`POST /tabs/:tabId/rounds`) continuam processando solicitações de clientes operacionais e calculando transacionalmente a rodada interna.
- [ ] Testes transacionados em concorrência / replay com o mesmo identificador de idempotência devolvem sem erro o pedido persistido quando idêntico o DTO comercial purificado.

### 12. Rubrica de Autoavaliação Congelada (100 pontos)

A avaliação contínua pré e pós-implementação usará rigorosamente esta rubrica inalterada de 100 pontos:

| Critério | Pontos | Metodologia e Requisitos de Aferição |
| :--- | :---: | :--- |
| **1. Correção funcional e preservação dos invariantes** | 30 | O DTO normaliza os campos avulsos para `tabId=null`, `roundNumber=null`, `roundKind="production"` e `reversesOrderId=null`, além de preservar a negação contra canais externos (`ifood`/`deliverymuch`). |
| **2. Testes de regressão, integração e casos-limite** | 20 | Existência e aprovação com 100% de sucesso da nova suíte `tests/h01-orders-dto.test.js` (testes unitários individuais para cada campo proibido, conjunção combo, campos desconhecidos, ausência de efeitos de banco, rodadas dedicadas e replay de idempotência), além dos testes contínuos do projeto. |
| **3. Segurança, integridade transacional e concorrência** | 15 | Garantia de travamento de erros preliminar fora e antes de travas de idempotência (`pg_advisory_xact_lock`), mantendo inalterados transações e saldos mercantis. |
| **4. Aderência integral à especificação** | 15 | Fidelidade estrita entre esta especificação, o código desenvolvido em domínio/API e as mensagens e structures de código que refutam entradas anômalas. |
| **5. Qualidade de código, clareza e manutenibilidade** | 10 | Simplicidade estrutural seguindo a doutrina `Ponytail full`, ausência de código defensivo verboso redundante e reaproveitamento modular entre domínio e roteador. |
| **6. Operação, observabilidade, documentação e rollback** | 5 | Retorno limpo e rastreável via mensagens JSON explanatórias sem expor stack trace, bem como garantia de semântica não destrutiva que admite rollback instantâneo por git em caso de necessidade operacional. |
| **7. Disciplina de escopo, commit e reprodutibilidade** | 5 | Alteração limpa circundante apenas ao escopo imediato da tarefa H-01, sem sobras de debugging, lint aprovado limpo com `npm run check` e conformidade milimétrica do commit obrigatório (`fix(orders): bloquear campos estruturais na criacao avulsa`). |
| **TOTAL** | **100** | Aprovada sem ressalvas na etapa de revisão (`/review`). |


---

## Especificação H-02: Impedir Fechamento de Comanda com Produção Pendente

### 1. Problema e Evidências
Atualmente, o manipulador de `POST /tabs/:tabId/close` no backend valida se `tab.balanceCents === 0` (quitação financeira) e, caso verdade, executa um `UPDATE` no PostgreSQL transformando irreversivelmente todas as rodadas nos estados `confirmed`, `in_preparation` ou `ready` diretamente para `completed`.  
**Consequência de falha:** Ordens impressas e enviadas para a tela da cozinha em `confirmed` ou `in_preparation` são apagadas da fila de produção antes mesmo de serem finalizadas pela cozinha, apenas porque o cliente pagou a conta antecipadamente no balcão.

### 2. Comportamento Atual vs Desejado
**Atual:**
- Cliente faz pedido na mesa (entra na cozinha como `confirmed`).
- Cliente levanta, paga a conta inteira (saldo zera).
- Operador encerra a comanda na interface.
- Sistema autoriza, fecha a comanda, converte pedido da cozinha em `completed`. O chapeiro perde o ticket na tela.

**Desejado:**
- Cliente faz pedido na mesa.
- Cliente levanta, paga a conta inteira (saldo zera).
- Operador tenta encerrar a comanda: o sistema REST e o Banco rejeitam a mutação, e a UI exibe o motivo (produção pendente).
- O pedido prossegue seu ciclo na cozinha e chega em `ready`.
- Somente a partir de então (`balanceCents === 0` && `!pendingProduction`) a comanda pode ser encerrada. Somente as rodadas `ready` se convertem para `completed`.

### 3. Invariantes de Domínio e Segurança
1. O fechamento financeiro de uma comanda (`closed`) não pode suprimir, ocultar ou acelerar indevidamente o ciclo operacional de preparo (Cozinha).
2. A atualização atômica de rodadas no fechamento apenas afeta estados previamente maduros (`ready`). Rodadas em `confirmed`, `in_preparation` e `received` bloqueiam o fechamento.

### 4. Estados e Transições Afetadas
- Bloqueadores do fechamento da comanda: Estados da rodada em `received`, `confirmed` e `in_preparation`.
- Autorizadores do fechamento (ignorados para contagem pendente): `ready`, `completed`, `cancelled`.
- Transição SQL no encerramento de comanda (`/tabs/:tabId/close`): O update em `orders` filtrará exclusivamente pelas rodadas onde `status = 'ready'`.

### 5. Contratos HTTP e de Persistência
**Retorno 409 (Erro Estruturado de Concorrência e Regra de Negócio):**
```json
{
  "code": "TAB_PRODUCTION_PENDING",
  "message": "Existem rodadas aguardando preparo na cozinha. Não é possível encerrar a comanda.",
  "pendingRounds": [
    { "id": "uuid", "status": "confirmed", "roundNumber": 1 }
  ]
}
```

### 6. Arquivos e Símbolos
- `apps/api/src/server.js`: Modificar a rota `POST /tabs/:tabId/close` (L1419+) para inspecionar `view.rounds` quanto a itens bloqueadores, retornar HTTP 409, e mudar o SQL de `completed` para atuar unicamente sobre `ready`.
- `apps/ops-web/main.js`: Modificar `renderTabs()` para injetar o atributo estático `disabled` e `title` descritivo na DOM ao desenhar cartões de comandas zeradas que possuem `pendingRounds`. Modificar tratamento do erro global em `notify`.
- `tests/smoke.mjs`: Patch de `preparationMode: 'direct_handoff'` nos itens sintéticos de testes financeiros para não bloquearem falsamente a suíte de smoke.
- `tests/h02-tab-close.test.js` (Novo): Casos-limite focados, matrizes e teste de transações abordando exclusivamente o fluxo da comanda (invariante 1 e 2).

### 7. Estratégia de Migração e Compatibilidade
Não há quebra de migrações estruturais do banco (schema mantido). O frontend consumirá a nova semântica da DOM por processamento local na renderização. 

### 8. Testes (Unitário, Integração, Concorrência)
1. **Matriz:** Fechar com saldo zerado e rodada `confirmed` (falha).
2. **Matriz:** Fechar com saldo zerado e rodada `in_preparation` (falha).
3. **Matriz:** Fechar com saldo zerado e TODAS `ready` (sucesso, fechamento atômico).
4. **Rollback e Transacionalidade:** Garantir que erro não consolida mudança nenhuma.
5. **Concorrência:** Se uma request concorrente abrir uma rodada enquanto a comanda fecha, a validação no preflight deve capturar ou os locks do PG devem repelir (Testes em `h02`).
6. **Interface:** Botão inacessível e aviso na UI sem estourar layouts (testado sinteticamente ou render test).

### 9. Riscos, Rollback e Fora de Escopo
- **Risco:** Comandas legadas esquecidas em `confirmed` podem não conseguir fechar. 
- **Fora de Escopo:** Não implementaremos um fluxo de "forçar fechamento cancelando itens da cozinha". Se a loja desejar forçar, ela deve estornar e cancelar o item explicitamente pela regra de negócio via tela.
- **Rollback:** Retornar os arquivos via `git revert`.

### 10. Rubrica de Autoavaliação Congelada (100 pontos)

| Critério | Pontos | Como será medido |
|---|---:|---|
| Correção funcional e preservação dos invariantes | 30 | `tabs/close` expurga rodadas pendentes e falha o fechamento. |
| Testes de regressão, integração e casos-limite | 20 | Suíte `h02-tab-close.test.js` atende matrizes e rollback. |
| Segurança, integridade transacional e concorrência | 15 | Locks e validação antecedem mutações ao PG, impedindo vazamentos. |
| Aderência integral à especificação | 15 | Payload `409 TAB_PRODUCTION_PENDING` não vaza SQL/dados e instrui. |
| Qualidade de código, clareza e manutenibilidade | 10 | Javascript claro e vanilla UI compatível com Web Design Guidelines. |
| Operação, observabilidade, documentação e rollback | 5 | Mensagens inteligíveis e log local consistente no `smoke.mjs`. |
| Disciplina de escopo, commit e reprodutibilidade | 5 | Apenas arquivos alvo alterados; 1 commit seguindo convenção H-02. |


---

## Especificação H-03: Reconciliar Cancelamento sem Confirmar Pedido

### 1. Problema e Evidências
Atualmente, as integrações iFood e Delivery Much verificam o status externo (ex: `CANCELLED`) para determinar se o comando local `accept` foi aplicado (assumindo que "cancelado" engloba uma fase pós-aceite perante a API externa). Contudo, a função de orquestração `finalizeCommand` em ambos os adaptadores lê cega e unicamente o `command.action === "accept"` e invoca `activateAcceptedOrder()`. Isso gera uma grave violação: a loja emite tickets na cozinha e desconta estoques para um pedido já morto na plataforma.

### 2. Comportamento Atual vs Desejado
**Atual:**
- Comando "accept" aciona API. Por falha de rede (ou timeout), vira "ambíguo".
- A reconciliação busca o status e vê `CANCELLED` e marca `applied = true`.
- `finalizeCommand` força transição para "confirmed" localmente, disparando deduções e impressões.

**Desejado:**
- A função de reconciliação retorna estado explícito, informando não apenas `applied: true` e `externalStatus`, mas também `localEffect: "cancel"`.
- `command-outbox.js` transporta esse `localEffect`.
- `finalizeCommand` avalia o `localEffect` e, se for `"cancel"`, delega via `applyIntegratedTransition(..., "cancelled")`, garantindo consistência com o banco e integridade de estoque, sem invocar tickets na cozinha.

### 3. Invariantes de Domínio e Segurança
1. Um pedido resolvido externamente como `CANCELLED` sempre resulta no efeito local `"cancel"` (estado `"cancelled"` no banco), independente da intenção original do comando.
2. A transição para `"cancelled"` em um pedido que ainda está em `"received"` jamais afeta o balanço de estoque (pois as deduções só se consolidam de `"confirmed"` em diante).
3. A mutação do pedido, command e channel mapping ocorre obrigatoriamente englobada em uma única transação atômica (`db.transaction`).

### 4. Estados e Transições Afetadas
- Pedidos originalmente `"received"` que reconciliam como `CANCELLED`: movem para `"cancelled"` sem baixa de estoque e sem ativação.
- Pedidos em retry e replay lidarão deterministicamente com `localEffect: "cancel"`.

### 5. Contratos HTTP e Persistência
- Sem alterações estruturais de esquema de DB ou requisições às APIs de parceiros.

### 6. Arquivos e Símbolos
- `apps/api/src/integrations/providers/ifood.js`: Refatorar `reconcileCommand` e `finalizeCommand`.
- `apps/api/src/integrations/providers/deliverymuch.js`: Refatorar `reconcileCommand` e `finalizeCommand`.
- `apps/api/src/integrations/command-outbox.js`: Atualizar a passagem de parâmetro injetando `localEffect: result.localEffect || command.action`.
- `tests/integrations.test.js`: Expandir a suíte para capturar a reconciliação do `accept` frente a um `CANCELLED`.

### 7. Estratégia de Migração e Compatibilidade
Totalmente retrocompatível; os comandos "sujos" pendentes na fila receberão a reconciliação correta assim que o novo código rodar via poller.

### 8. Testes Planejados
1. Unitário/Integração para iFood: `accept` + estado externo `CANCELLED` -> resulta em `cancelled` sem chamadas de impressora ou estoque.
2. Unitário/Integração para Delivery Much: mesmo que acima.
3. Teste transacional em cenário concorrente de compensação idempotente.

### 9. Riscos, Rollback e Fora de Escopo
- **Risco:** Ausente, pois solidifica e limita os danos de cancelamento surpresa.
- **Fora de Escopo:** Habilitar endpoints reais. O teste acontecerá em mock isolado.
- **Rollback:** `git checkout main -- apps/api/src/integrations`.

### 10. Rubrica de Autoavaliação Congelada (100 pontos)

| Critério | Pontos | Avaliação/Métrica |
|---|---:|---|
| Correção funcional e preservação dos invariantes | 30 | `activateAcceptedOrder` nunca é acionado se estado for `CANCELLED`. |
| Testes de regressão, integração e casos-limite | 20 | Testes de integração na suíte oficial falham sem a mudança e passam com a mudança. |
| Segurança, integridade transacional e concorrência | 15 | Manipulação confinada no transaction callback em `command-outbox`. |
| Aderência integral à especificação | 15 | `localEffect` modelado em todos os layers. |
| Qualidade de código, clareza e manutenibilidade | 10 | Javascript claro sem magic strings espalhadas. |
| Operação, observabilidade, documentação e rollback | 5 | Compatível via fallback silencioso (`command.action`). |
| Disciplina de escopo, commit e reprodutibilidade | 5 | 1 Commit isolado na branch. |


---

## H-04: Preservar meios de pagamento externos

### 1. Problema e Evidências
O adapter iFood converte falhamente múltiplos pagamentos offline ou não correspondentes em `app_paid` (pagamento online do aplicativo) nas linhas 104 e 105. O Delivery Much simplesmente não envia nenhum `paymentMethod`, fazendo a lógica de ingestão (`order-ingestion.js:35`) assumir `app_paid`. Essa sobre-substituição elimina o saldo de "a receber" local e distorce contabilidade (caixa e conciliações online). 

### 2. Comportamento Atual x Desejado
**Atual:** Múltiplas entradas offline do iFood viram `app_paid`. Entradas não formatadas do DM viram `app_paid`. Na sumarização, tudo de `app_paid` é computado no montante final ou descartado cegamente, não permitindo divisão correta em métodos `mixed`.
**Desejado:**
1. Os adaptadores deverão analisar os campos de `payments.methods` e exportá-los em uma nova propriedade `metadata.externalPayments` no formato `[{ method, amount, type }]`.
2. Se houver mais de um método originado, o `paymentMethod` principal do pedido virará `mixed`. 
3. Se um adaptador falhar em identificar pagamentos ou não houver meios, adotará `payment_reconciliation_required` em vez de presumir `app_paid`.
4. O resumo financeiro iterará por `metadata.externalPayments` caso o tipo seja `mixed`, segregando corretamente os montantes por tipo, desprezando `type: "online"` do balanço de Caixa mas contando nas vendas.

### 3. Invariantes de Domínio e Segurança
- `finance_entries` mantém sua unicidade via INDEX `finance_entries_one_order_effect (order_id, type)`. NENHUMA linha a mais é introduzida para as vendas (`sale`).
- Os somatórios brutos e totais se manterão exatos, a granularidade afeta apenas a métrica de "Caixa".
- Operações de rollback financeiro (ex: cancelamentos) usarão os mesmos `externalPayments` na mutação do log.

### 4. Estados, Transições e Arquivos
- **Adapters (`apps/api/src/integrations/providers/ifood.js` e `deliverymuch.js`)**: Adaptar parsers para derivar os `externalPayments` reais de recebimentos.
- **Ingestão (`apps/api/src/integrations/order-ingestion.js`)**: Abolir o default silencioso `"app_paid"` -> aplicar `"payment_reconciliation_required"`. Repassar `input.externalPayments` para a persistência em `metadata.externalPayments`.
- **Core (`packages/finance-core/index.js`)**: Extrair as parcelas em `summarizeFinance()` e passá-las na `buildEntriesFromOrder()` dentro do payload de `metadata`.

### 5. Estratégia de Migração e Compatibilidade
- Pedidos antigos (`order`) que não possuem `metadata.externalPayments` e têm tipo nativo continuarão utilizando `order.paymentMethod` em `summarizeFinance`, suportando transição fluída (100% retrocompatível).

### 6. Testes Específicos
- Fixtures online puros (iFood e Delivery Much).
- Fixtures de offline único (ex: cash, pix)
- Fixture mistos (ex: cash e credit).
- Validação em pipeline de relatórios e de caixa sem duplicidade online.
- Teste de idempotência validando `repeated: true`.

### 7. Critérios de Aceitação e Riscos
- Testes listados acima aprovados.
- Nenhuma string "mágica" nova, adoção apenas da flag de reconciliação.
- Risco zero, visto que falhas de detecção acionam `payment_reconciliation_required` invés de fingir um pagamento e roubar dinheiro contábil.

### 8. Rubrica de Autoavaliação
| Critério | Pontos | Como será medido |
|---|---:|---|
| Funcional | 30 | `finance-core` distribui múltiplos meios e os converte para frontend via JSON `externalPayments` |
| Testes | 20 | Adicionadas e passadas fixtures E2E rigorosas em suítes para pagamentos mistos e nulos |
| Integridade e Concorrência | 15 | Unicidade de `finance_entries` respeitada perante pagamentos múltiplos e transação segura mantida. |
| Aderência | 15 | Reconciliação sem omissões e ausência total de preenchimentos fantasma de `app_paid`. |
| Qualidade de código | 10 | Evitou refs circulares, padronizou nome dos arrays JSON |
| Observabilidade e Rollback | 5 | Inseriu tag `payment_reconciliation_required` em falta de informação, permitindo ação humana, compatibilidade total com pedidos velhos |
| Disciplina Git | 5 | Commit único limpo ao final |


---

## H-05: Unificar política de estoque entre cancelamentos avulsos e de comanda

### 1. Problema e Evidências
Atualmente existe uma fratura comportamental na gestão de estoque mediante cancelamento em estados onde o insumo já foi comprometido (ex: `in_preparation`, `ready`). Pedidos avulsos devolvem o item integralmente ao saldo positivo, reavendo estoque mágico de itens fisicamente preparados/extraviados. As comandas não devolvem o item, mas os "ignoram", não provendo registro auditável explícito da perda daquele insumo (`wastage` ou similar).

### 2. Comportamento Atual e Desejado
**Atual:** 
- Rota Avulsa (`server.js:1594`): estorna para `["confirmed", "in_preparation", "ready"]` com `reason = "cancellation"` e `delta > 0`.
- Rota Comanda (`server.js:1294`): estorna apenas se `original.status === "confirmed"`.

**Desejado:** 
- Apenas o status `confirmed` deve adicionar quantidade devolvida ao saldo `stock_balances`.
- Os status `in_preparation` ou `ready` devem gerar um movimento em `stock_movements` com motivo `cancellation_loss`, `delta = 0`, mas contendo a propriedade `metadata.lostQuantity` referenciando o que foi jogado fora (consumo físico) por causa da rescisão tardia.
- Ambas as rotas (avulso e comanda) devem operar idênticas sob esse novo modelo, tornando o estoque blindado a falhas operacionais e alinhando com princípios transacionais contábeis.

### 3. Invariantes de Domínio e Segurança
- O `stock_movements` possui a chave `(order_id, category, reason)` única, que protegerá `cancellation_loss` de repetições (idempotência).
- Estoque consumido não pode gerar delta positivo nem sumir sem registro em banco. O saldo (`stock_balances`) permanece intacto no `cancellation_loss`.
- A trava `FOR UPDATE` sobre saldos continuará exclusiva de transações onde o delta é real, mas o bloqueio não será efetuado para deltas zerados (protegendo throughput em cancelamentos de desperdício).

### 4. Estados e Transições
- `confirmed` -> `cancellation`: estoque estornado.
- `in_preparation` | `ready` -> `cancellation`: estoque mantido em falta, mas evento de perda lavrado.

### 5. Estratégia de Migração e Compatibilidade
- A modificação usa as mesmas tabelas; o novo identificador `cancellation_loss` será lido pela `inventoryView` ou relatórios sem corromper nenhuma coluna anterior.

### 6. Arquivos e Símbolos
- `apps/api/src/server.js`: atualizar `changeStock()` para suportar as condicionais `cancellation_loss` (travando a query de update de quantidade);
- `apps/api/src/server.js`: atualizar os invocadores em `PATCH /orders/:id/status` e em `POST /tabs/.../cancellations`.

### 7. Critérios de Aceitação e Autoavaliação
1. Avulsos estornam perfeitamente para `confirmed`.
2. Avulsos geram `cancellation_loss` com `delta: 0` e sem mexer no saldo na produção.
3. Comandas seguem estritamente a mesmíssima simetria, propagando partial returns.
4. Nenhuma mutação sem a chave primária real.
5. Observabilidade intacta (logs contêm `metadata.lostQuantity`).

### 8. Rubrica
| Critério | Pontos | Como será medido |
|---|---:|---|
| Correção funcional e preservação dos invariantes | 30 | O saldo não engorda mais em perdas |
| Testes de regressão, integração e casos-limite | 20 | Adicionadas e passadas fixtures E2E rigorosas nas transições de estados e parciais |
| Segurança, integridade transacional e concorrência | 15 | Idempotência e FOR UPDATE avaliados |
| Aderência integral à especificação | 15 | Idêntico entre avulsos e comandas |
| Qualidade de código, clareza e manutenibilidade | 10 | DRY code em server.js |
| Operação, observabilidade, documentação e rollback | 5 | Log visível |
| Disciplina de escopo, commit e reprodutibilidade | 5 | Apenas estoque fixado |


---

## H-06: Auditoria Transacional Útil

### Problema e Evidências
Atualmente a auditoria do sistema reside em `app.addHook("onResponse", ...)`, gravando de forma assíncrona o log após o término do request.
Se o evento da mutação tiver sucesso e o insert de auditoria falhar (ex: queda de rede, deadlock no pool), o negócio muda de estado sem deixar rastro. Adicionalmente, a estrutura não guarda as mutações de payload, o que reduz seu valor real (só registra `action` rasas como o HTTP Method, e não o delta da mutação).

### Comportamento Atual vs Desejado
- **Atual:** Assíncrono no `onResponse`, vulnerável a falha silenciosa, salva apenas `actor_id`, `action` (e.g. POST), `resource_path`.
- **Desejado:** Síncrono (transacional com o negócio), seguro por `idempotency_key` impedindo duplicados, salvando ação semântica (e.g. `order.status_patched`), `state_before` e `state_after` devidamente sanitizados, rejeitando armazenar credenciais ou PI.

### Invariantes de Domínio e Segurança
1. A gravação de log falha `->` transação principal sofre ROLLBACK.
2. Nenhuma credencial (password, csrf, tokens, bearers) entra no log JSONB.
3. Eventos idempotentes (replay) não podem gerar log redundante (coberto pelo desvio onde log é inserido apenas se `!claim.repeated`).
4. Endpoints abertos ou queries de telemetria sem ator persistente não exigem auditoria rigorosa (embora o hook de read ainda possa manter observabilidade leve opcional).

### Estados e Transições Afetadas
Todas as rotas HTTP de mutação (`isMutation() === true`), tais como:
- `POST /orders`
- `PATCH /orders/:id/status`
- `POST /tabs.../cancellations`
- `POST /catalog...`

### Contratos HTTP e Persistência
- `ALTER TABLE audit_events` incluirá as colunas `idempotency_key`, `state_before (jsonb)`, `state_after (jsonb)`.
- Adição de índice parcial ou retenção temporal na busca `GET /audit` (nova política administrativa).

### Estratégia de Migração e Compatibilidade
- Campos legados preexistentes recebem `NULL` nos campos de state, sem necessidade de truncate table.
- A função transacional injetada fará o parsing.

### Testes Unitários e Integração
- **Falha injetada:** Mockar erro no insert da auditoria garantindo que a tabela alvo não gravou os inserts principais de negócio.
- **Sanitização:** Assert contra o body armazenado esperando ausência de `password` e afins.
- **Autorização:** Apenas roles corretas (admin) acessam leitura de auditoria.

### Autoavaliação e Rubrica
| Critério | Pontos |
|---|---:|
| Correção funcional e preservação dos invariantes | 30 |
| Testes de regressão, integração e casos-limite | 20 |
| Segurança, integridade transacional e concorrência | 15 |
| Aderência integral à especificação | 15 |
| Qualidade de código, clareza e manutenibilidade | 10 |
| Operação, observabilidade, documentação e rollback | 5 |
| Disciplina de escopo, commit e reprodutibilidade | 5 |


