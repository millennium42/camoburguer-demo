# Node Description Batch 6 of 14

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the prompt below and write
your JSON answer to the answer file.

## Prompt

You are documenting nodes in a knowledge graph.
For each entry below, write ONE concise factual plain-language sentence
describing what it is or does. Use only the provided context.
For a code symbol (kind=code-symbol — a function, class, or constant),
describe what the function/symbol does based on its name, source location
and neighbors — e.g. "Resolves the configured ontology profile from graphify.yaml.".
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "src_auth_revokesession": "revokeSession()" | kind=code-symbol | source=apps/api/src/auth.js:L143 | neighbors=[auth.js, hashToken(), server.js, auth.test.js]
- "src_idempotency_basispoints": "basisPoints()" | kind=code-symbol | source=apps/api/src/idempotency.js:L29 | neighbors=[idempotency.js, decimalUnits(), canonicalItem(), orderFingerprintPayload()]
- "src_idempotency_canonicaljson": "canonicalJson()" | kind=code-symbol | source=apps/api/src/idempotency.js:L52 | neighbors=[idempotency.js, canonicalValue(), fingerprint(), idempotency.test.js]
- "src_idempotency_orderfingerprintpayload": "orderFingerprintPayload()" | kind=code-symbol | source=apps/api/src/idempotency.js:L84 | neighbors=[idempotency.js, basisPoints(), server.js, idempotency.test.js]
- "src_order_tab_assignment_normalizetabassignmentpayload": "normalizeTabAssignmentPayload()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L7 | neighbors=[order-tab-assignment.js, clean(), server.js, order-tab-assignment.test.js]
- "src_print_queue_assertprintpayloadsize": "assertPrintPayloadSize()" | kind=code-symbol | source=apps/api/src/print-queue.js:L19 | neighbors=[print-queue.js, printPayloadBytes(), server.js, print-queue.test.js]
- "src_print_queue_printpayloadbytes": "printPayloadBytes()" | kind=code-symbol | source=apps/api/src/print-queue.js:L15 | neighbors=[print-queue.js, assertPrintPayloadSize(), printPayload(), print-queue.test.js]
- "src_server_reconcileprintjob": "reconcilePrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L852 | neighbors=[server.js, dispatchPrintJob(), bridgeHeaders(), readBridgeJson()]
- "src_validation": "validation.js" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, equalSecret(), safeId(), validPrintContent()]
- "tests_print_bridge_test": "print-bridge.test.js" | kind=code-symbol | source=tests/print-bridge.test.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, equalSecret(), safeId(), validPrintContent()]
- "tests_smoke_api": "api()" | kind=code-symbol | source=tests/smoke.mjs:L34 | neighbors=[smoke.mjs, request(), createOrder(), expectBlockedAssignment()]
- "domain_index_buildkitchenticket": "buildKitchenTicket()" | kind=code-symbol | source=packages/domain/index.js:L226 | neighbors=[index.js, requiresKitchenPreparation(), domain.test.js]
- "domain_index_calculateordertotal": "calculateOrderTotal()" | kind=code-symbol | source=packages/domain/index.js:L43 | neighbors=[index.js, normalizeDiscountPercent(), createOrder()]
- "domain_index_createcancellationorder": "createCancellationOrder()" | kind=code-symbol | source=packages/domain/index.js:L190 | neighbors=[index.js, createOrder(), domain.test.js]
- "domain_index_createcashshift": "createCashShift()" | kind=code-symbol | source=packages/domain/index.js:L262 | neighbors=[index.js, domain.test.js, finance.test.js]
- "domain_index_normalizediscountpercent": "normalizeDiscountPercent()" | kind=code-symbol | source=packages/domain/index.js:L35 | neighbors=[index.js, calculateOrderTotal(), createOrder()]
- "domain_index_transitionorder": "transitionOrder()" | kind=code-symbol | source=packages/domain/index.js:L199 | neighbors=[index.js, confirmOrder(), domain.test.js]
- "finance_core_index_businessdate": "businessDate()" | kind=code-symbol | source=packages/finance-core/index.js:L111 | neighbors=[index.js, zonedParts(), finance.test.js]
- "finance_core_index_filterentries": "filterEntries()" | kind=code-symbol | source=packages/finance-core/index.js:L140 | neighbors=[index.js, assertOperationalDate(), finance.test.js]
- "finance_core_index_summarizefinance": "summarizeFinance()" | kind=code-symbol | source=packages/finance-core/index.js:L155 | neighbors=[index.js, businessHour(), finance.test.js]
- "finance_core_index_zonedparts": "zonedParts()" | kind=code-symbol | source=packages/finance-core/index.js:L98 | neighbors=[index.js, businessDate(), businessHour()]
- "integrations_command_outbox_classifycommanderror": "classifyCommandError()" | kind=code-symbol | source=apps/api/src/integrations/command-outbox.js:L19 | neighbors=[command-outbox.js, sendCommand(), integrations.test.js]
- "integrations_command_outbox_finishunknown": "finishUnknown()" | kind=code-symbol | source=apps/api/src/integrations/command-outbox.js:L26 | neighbors=[command-outbox.js, reconcileCommand(), sendCommand()]
- "integrations_command_outbox_reconcilecommand": "reconcileCommand()" | kind=code-symbol | source=apps/api/src/integrations/command-outbox.js:L38 | neighbors=[command-outbox.js, processChannelCommands(), finishUnknown()]
- "integrations_integration_repository_getpendingcommands": "getPendingCommands()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L187 | neighbors=[integration-repository.js, deliverymuch.js, ifood.js]
- "integrations_integration_repository_insertchannelevent": "insertChannelEvent()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L104 | neighbors=[integration-repository.js, deliverymuch.js, ifood.js]
- "integrations_integration_repository_updatechannelevent": "updateChannelEvent()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L126 | neighbors=[integration-repository.js, columnFor(), deliverymuch.js]
- "integrations_order_actions_activateacceptedorder": "activateAcceptedOrder()" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L125 | neighbors=[order-actions.js, deliverymuch.js, ifood.js]
- "integrations_polling_runner_startintegrationpolling": "startIntegrationPolling()" | kind=code-symbol | source=apps/api/src/integrations/polling-runner.js:L11 | neighbors=[polling-runner.js, assertConfigured(), server.js]
- "ops_web_main_addoraccumulateitem": "addOrAccumulateItem()" | kind=code-symbol | source=apps/ops-web/main.js:L151 | neighbors=[main.js, validDiscountPercent(), ops-web.test.js]
- "ops_web_main_escapehtml": "escapeHtml()" | kind=code-symbol | source=apps/ops-web/main.js:L94 | neighbors=[main.js, renderFinanceSummary(), ops-web.test.js]
- "ops_web_main_formatwhen": "formatWhen()" | kind=code-symbol | source=apps/ops-web/main.js:L302 | neighbors=[main.js, printShiftReport(), renderShifts()]
- "ops_web_main_nextorderattempt": "nextOrderAttempt()" | kind=code-symbol | source=apps/ops-web/main.js:L204 | neighbors=[main.js, integrationAttempt(), ops-web.test.js]
- "ops_web_main_printshiftreport": "printShiftReport()" | kind=code-symbol | source=apps/ops-web/main.js:L250 | neighbors=[main.js, formatWhen(), money()]
- "ops_web_main_reconcilecartitems": "reconcileCartItems()" | kind=code-symbol | source=apps/ops-web/main.js:L120 | neighbors=[main.js, refreshAll(), ops-web.test.js]
- "ops_web_main_refreshsafe": "refreshSafe()" | kind=code-symbol | source=apps/ops-web/main.js:L1077 | neighbors=[main.js, openTabAssignment(), refreshAll()]
- "ops_web_main_rendercatalog": "renderCatalog()" | kind=code-symbol | source=apps/ops-web/main.js:L324 | neighbors=[main.js, refreshAll(), resolveActiveCatalogCategory()]
- "ops_web_main_rendertabs": "renderTabs()" | kind=code-symbol | source=apps/ops-web/main.js:L464 | neighbors=[main.js, refreshAll(), renderActiveTab()]
- "ops_web_main_resolveactivecatalogcategory": "resolveActiveCatalogCategory()" | kind=code-symbol | source=apps/ops-web/main.js:L142 | neighbors=[main.js, renderCatalog(), ops-web.test.js]
- "ops_web_main_samecatalogadminsession": "sameCatalogAdminSession()" | kind=code-symbol | source=apps/ops-web/main.js:L932 | neighbors=[main.js, catalogAdminSessionIsCurrent(), ops-web.test.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-005.json

Keep each description factual and concise (one sentence). No markdown, no prose
outside the JSON object. It is acceptable to omit a node if context is
insufficient — but include every node you can ground confidently.

Example answer format:
```json
{
  "node_id_1": "Resolves the configured ontology profile from graphify.yaml.",
  "node_id_2": "Colonel James Barclay, an antagonist in The Crooked Man."
}
```
