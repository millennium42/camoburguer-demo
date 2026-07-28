# H-01 — Impedir criação avulsa de rodadas e cancelamentos forjados

## 1. Problema e Evidências

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

## 2. Comportamento Atual e Comportamento Desejado

- **Comportamento Atual (Incorreto):** O endpoint `POST /orders` acata sem repúdio atributos reservados, possibilitando ao chamador definir arbitrariamente identificadores de rodadas (`roundNumber`, `roundKind="cancellation"`), vincular pedidos avulsos a comandas sem a verificação transacional de abertura (`tabId`) ou emular uma transação compensatória de estorno sem reconciliação (`reversesOrderId`). Adicionalmente, campos avulsos e anômalos fora do modelo conceitual são consumidos, alterando fingerprints idempotentes ou sendo transacionados pelo banco implicitamente.
- **Comportamento Desejado (Correto):** O servidor deve impor um **DTO explícito** para chamadas dirigidas a `POST /orders`, rejeitando sumariamente (via HTTP `400 Bad Request` na verificação preliminar, antes de qualquer requisição ao banco de dados ou trava de idempotência) a incidência dos campos estruturais reservados (`tabId`, `roundNumber`, `roundKind`, `reversesOrderId`). Adicionalmente, deve se blindar contra quaisquer propriedades alheias ao escopo comercial canônico (negação de propriedades desconhecidas por allowlist). Quando um pedido avulso é aceito e normalizado, o sistema forçar soberanamente em sua estrutura persistida os defaults invioláveis: `tabId: null`, `roundNumber: null`, `roundKind: "production"` e `reversesOrderId: null`.

## 3. Invariantes de Domínio e Segurança

1. **Invariante de Fechamento de Canal Avulso:** Criações iniciadas por `POST /orders` são invariavelmente pedidos autônomos, de rodada produtiva padrão e não vinculáveis de origem a comandas nem atribuídos como reversões financeiras ou corretivas.
2. **Invariante de Rotas Dedicadas:** Inserções de rodadas consumidas nas comandas ocorrem estritamente pela via autenticada de `POST /tabs/:tabId/rounds` (que impõe locks de comanda aberta). Compensações, estornos e rodadas corretivas decorrem exclusivamente das lógicas autoritativas e homologadas de cancelamento (como `createCancellationOrder()`).
3. **Invariante de Isolamento Idempotente Transacional:** Tentativas rejeitadas na borda do protocolo por infração ao DTO de pedidos avulsos jamais alocam registros na tabela `idempotency_records`, tampouco reduzem o saldo na tabela de almoxarifado (`stock_movements`) ou geram spools na fila de impressão de tickets (`print_jobs`).
4. **Invariante de Estabilidade do Fingerprint:** O cálculo criptográfico do fingerprint em SHA-256 (em `idempotency.js`) espelha perfeitamente as definições canônicas do DTO e consolida todos os atributos estruturais (incluindo `roundKind` e `roundNumber` quando determinísticos) e comerciais normalizados antes da gravação na base relacional.

## 4. Estados e Transições Afetados

A mitigação assegura o ciclo de vida comercial padrão (`received → confirmed → ready` para modos como `direct_handoff`, ou `confirmed` para produção na cozinha). Ao restringir modificações no atributo `roundKind` (forçando `production` no avulso) e vetar referências à reversão (`reversesOrderId`), garante-se que nenhum pedido nasça mascarado em estado corretivo ou altere de forma ilícita transições dependentes da máquina de estados do módulo operacional.

## 5. Contratos HTTP e de Persistência Afetados

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

## 6. Estratégia de Migração e Compatibilidade

A alteração em `POST /orders` é perfeitamente retrocompatível com a totalidade dos clientes bem comportados do sistema (`apps/ops-web/main.js`, scripts de demonstração, simuladores transacionais e relatórios de fluxo). Nenhuma modificação no esquema de tabelas no PostgreSQL é necessária nem alteração em rotas de comanda, mantendo 100% de estabilidade com ordens legadas na base.

## 7. Arquivos e Símbolos Prováveis

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

## 8. Estratégia de Testes e Plano de Regressão

1. **Testes HTTP de Bloqueio Estrutural (Isolados e em Combo):** Verificações independentes via `app.inject` na API injetando isoladamente: `tabId: "uuid"`, `roundNumber: 2`, `roundKind: "cancellation"`, `reversesOrderId: "uuid"`, bem como requisições englobando todos em simultâneo. Em todos os casos, afirmação estrita de resposta HTTP `400` com código `STRUCTURAL_FIELDS_FORBIDDEN`.
2. **Teste de Rejeição de Propriedades Desconhecidas:** Verificação submetendo atributos anômalos ilegítimos (e.g., `forgedAdminBonus: 1000`, `bypassStock: true`), constatando retorno HTTP `400` com código `UNKNOWN_FIELD`.
3. **Teste de Ausência de Efeitos Mutações no Banco (Idempotência, Almoxarifado e Ticket):** Comprovar consultando as tabelas e memórias logo após as rejeições, provando que o estoque do SKU não sofreu decremento, nenhum ticket de cozinha gerou spool e não houve inserção em `idempotency_records`.
4. **Teste de Pedido Avulso Legítimo + Regressão Compatível:** Verificação transacional atestando criação plena com retorno HTTP `201`, na qual o servidor enxerta limpidamente `tabId: null`, `roundNumber: null`, `roundKind: "production"` e `reversesOrderId: null`.
5. **Teste de Rodada Legítima por Rota Dedicada:** Acionar `POST /tabs/:tabId/rounds` confirmando que a inclusão operacional de rodadas permanece operando fluidamente com numeração incremental soberana calculada em lock transacional do servidor e sem conflito de fingerprint.
6. **Teste de Replay Idempotente sob DTO Normalizado:** Enviar requisições repetidas portando o mesmo `Idempotency-Key` e acurácia comercial com campos ordenados analogamente para atestar compatibilidade contínua entre payloads saneados e fingerprints gravados.
7. **Regressão Institucional Completa:** Acionamento íntegro e irrestrito da suíte `npm test` e verificação de sintaxe para validar estabilidade transversal.

## 9. Observabilidade e Mensagens de Erro

- Falhas no saneamento na borda reportam erros informativos com semântica acionável para programadores e integradores sem vazar estruturas de SQL ou stack trace em produção:
  - `400 Bad Request`: `{ code: "STRUCTURAL_FIELDS_FORBIDDEN", message: "..." }`
  - `400 Bad Request`: `{ code: "UNKNOWN_FIELD", message: "..." }`
- Rejeições de provedores externos (`ifood`, `deliverymuch`) são preservadas na íntegra com a semântica existente (`EXTERNAL_SOURCE_REQUIRES_ADAPTER`).

## 10. Riscos, Rollback e Itens Fora de Escopo

- **Riscos e Mitigações:** O risco primário reside em bloquear equivocadamente propriedades legítimas utilizadas pelas interfaces ou testes existentes. Esse risco foi completamente suprimido pela varredura via `grep_search` pelo código fonte e inspeção de testes legados e front-end web, construindo uma allowlist comercial exata de 15 propriedades (incluindo chaves de suporte do catálogo e rastreio de seed como `id` e `createdAt`).
- **Procedimento de Rollback:** Em eventualidade imprecisa, a alteração se reverte pelo comando padrão de versionamento Git sem corromper nenhuma tabela de banco relacional, pois não realizamos alterações destrutivas em DDL ou migrations de base.
- **Fora do Escopo (Não Fazer):** Não alterar o formato externo das rotas de comanda em `server.js` nem empreender refatorações extensas na engine do domínio; a missão limita-se puramente a erradicar o bypass na criação avulsa e declarar o contrato estrito no DTO e idempotência.

## 11. Critérios de Aceitação Verificáveis

- [ ] Payload avulso válido submetido via HTTP POST `/orders` cria o pedido comercial perfeitamente e é sancionado com HTTP `201`.
- [ ] Presença de qualquer um dos campos reservados (`tabId`, `roundNumber`, `roundKind`, `reversesOrderId`) na rota HTTP `POST /orders` devolve invariavelmente HTTP `400` com código `STRUCTURAL_FIELDS_FORBIDDEN`.
- [ ] Atribuição ilícita de propriedades desconhecidas em `POST /orders` retorna imediatamente HTTP `400` (`UNKNOWN_FIELD`).
- [ ] Não há mutação detectada no estoque (`stock_movements`), criação de ordens, reserva de impressão (`print_jobs`) ou registros vinculados a chamadas na tabela `idempotency_records` perante payload refutado na borda.
- [ ] Rotas de rodada na comanda (`POST /tabs/:tabId/rounds`) continuam processando solicitações de clientes operacionais e calculando transacionalmente a rodada interna.
- [ ] Testes transacionados em concorrência / replay com o mesmo identificador de idempotência devolvem sem erro o pedido persistido quando idêntico o DTO comercial purificado.

## 12. Rubrica de Autoavaliação Congelada (100 pontos)

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
