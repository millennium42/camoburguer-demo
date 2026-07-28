# Node Description Batch 9 of 12

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

- "domain_catalog_directhandoffcategories": "directHandoffCategories" | kind=code-symbol | source=packages/domain/catalog.js:L79 | neighbors=[catalog.js]
- "domain_catalog_products": "products" | kind=code-symbol | source=packages/domain/catalog.js:L24 | neighbors=[catalog.js]
- "domain_index_allowed_transitions": "ALLOWED_TRANSITIONS" | kind=code-symbol | source=packages/domain/index.js:L26 | neighbors=[index.js]
- "integrations_integration_repository_claimchannelcommand": "claimChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L199 | neighbors=[integration-repository.js]
- "integrations_integration_repository_command_columns": "COMMAND_COLUMNS" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L17 | neighbors=[integration-repository.js]
- "integrations_integration_repository_event_columns": "EVENT_COLUMNS" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L10 | neighbors=[integration-repository.js]
- "integrations_integration_repository_findchannelevent": "findChannelEvent()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L96 | neighbors=[integration-repository.js]
- "integrations_integration_repository_mapping_columns": "MAPPING_COLUMNS" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L3 | neighbors=[integration-repository.js]
- "integrations_integration_routes_integrationroutes": "integrationRoutes()" | kind=code-symbol | source=apps/api/src/integrations/integration-routes.js:L5 | neighbors=[integration-routes.js]
- "integrations_order_actions_action_rules": "ACTION_RULES" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L17 | neighbors=[order-actions.js]
- "integrations_order_actions_channel_actions": "CHANNEL_ACTIONS" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L24 | neighbors=[order-actions.js]
- "ops_web_main_catalogadminsession": "catalogAdminSession()" | kind=code-symbol | source=apps/ops-web/main.js:L928 | neighbors=[main.js]
- "ops_web_main_cleartabassignment": "clearTabAssignment()" | kind=code-symbol | source=apps/ops-web/main.js:L611 | neighbors=[main.js]
- "ops_web_main_editcatalogitem": "editCatalogItem()" | kind=code-symbol | source=apps/ops-web/main.js:L1007 | neighbors=[main.js]
- "ops_web_main_financetypelabels": "financeTypeLabels" | kind=code-symbol | source=apps/ops-web/main.js:L82 | neighbors=[main.js]
- "ops_web_main_fulfillmentlabels": "fulfillmentLabels" | kind=code-symbol | source=apps/ops-web/main.js:L58 | neighbors=[main.js]
- "ops_web_main_hasunavailablecartitems": "hasUnavailableCartItems()" | kind=code-symbol | source=apps/ops-web/main.js:L147 | neighbors=[main.js]
- "ops_web_main_htmlescapes": "htmlEscapes" | kind=code-symbol | source=apps/ops-web/main.js:L91 | neighbors=[main.js]
- "ops_web_main_isintegratedorder": "isIntegratedOrder()" | kind=code-symbol | source=apps/ops-web/main.js:L53 | neighbors=[main.js]
- "ops_web_main_orderactions": "orderActions()" | kind=code-symbol | source=apps/ops-web/main.js:L565 | neighbors=[main.js]
- "ops_web_main_paymentlabels": "paymentLabels" | kind=code-symbol | source=apps/ops-web/main.js:L73 | neighbors=[main.js]
- "ops_web_main_requestcatalogarchive": "requestCatalogArchive()" | kind=code-symbol | source=apps/ops-web/main.js:L1027 | neighbors=[main.js]
- "ops_web_main_resetcatalogitemform": "resetCatalogItemForm()" | kind=code-symbol | source=apps/ops-web/main.js:L954 | neighbors=[main.js]
- "ops_web_main_showpanel": "showPanel()" | kind=code-symbol | source=apps/ops-web/main.js:L1098 | neighbors=[main.js]
- "ops_web_main_sourcelabels": "sourceLabels" | kind=code-symbol | source=apps/ops-web/main.js:L45 | neighbors=[main.js]
- "ops_web_main_state": "state" | kind=code-symbol | source=apps/ops-web/main.js:L1 | neighbors=[main.js]
- "ops_web_main_statuslabels": "statusLabels" | kind=code-symbol | source=apps/ops-web/main.js:L64 | neighbors=[main.js]
- "ops_web_main_syncdeliveryaddress": "syncDeliveryAddress()" | kind=code-symbol | source=apps/ops-web/main.js:L1089 | neighbors=[main.js]
- "ops_web_main_wirecart": "wireCart()" | kind=code-symbol | source=apps/ops-web/main.js:L1144 | neighbors=[main.js]
- "ops_web_main_wirecatalogadmin": "wireCatalogAdmin()" | kind=code-symbol | source=apps/ops-web/main.js:L1569 | neighbors=[main.js]
- "ops_web_main_wireforms": "wireForms()" | kind=code-symbol | source=apps/ops-web/main.js:L1681 | neighbors=[main.js]
- "ops_web_main_wirelogin": "wireLogin()" | kind=code-symbol | source=apps/ops-web/main.js:L870 | neighbors=[main.js]
- "ops_web_main_wiresse": "wireSse()" | kind=code-symbol | source=apps/ops-web/main.js:L2013 | neighbors=[main.js]
- "ops_web_main_wiretabs": "wireTabs()" | kind=code-symbol | source=apps/ops-web/main.js:L1103 | neighbors=[main.js]
- "providers_deliverymuch_createdeliverymuchadapter": "createDeliveryMuchAdapter()" | kind=code-symbol | source=apps/api/src/integrations/providers/deliverymuch.js:L58 | neighbors=[deliverymuch.js]
- "providers_deliverymuch_deliverymuch_status": "DELIVERYMUCH_STATUS" | kind=code-symbol | source=apps/api/src/integrations/providers/deliverymuch.js:L13 | neighbors=[deliverymuch.js]
- "providers_ifood_createifoodadapter": "createIFoodAdapter()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L155 | neighbors=[ifood.js]
- "providers_ifood_event_actions": "EVENT_ACTIONS" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L142 | neighbors=[ifood.js]
- "providers_ifood_event_aliases": "EVENT_ALIASES" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L57 | neighbors=[ifood.js]
- "providers_ifood_event_statuses": "EVENT_STATUSES" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L149 | neighbors=[ifood.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-008.json

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
