# Isolar fluxos manual e integrado

## Objetivo

Impedir criação ou transição de pedidos externos por rotas manuais, usando o mapping persistido como fato primário e a origem externa como fallback seguro para legado.

## Requisitos exatos

- REQ-001: `POST /orders` deve rejeitar `source=ifood` e `source=deliverymuch` antes de reservar idempotência ou produzir efeito.
- REQ-002: Rotas genéricas de status devem rejeitar pedidos com `channel_mapping`.
- REQ-003: Pedidos legados com origem `ifood` ou `deliverymuch` e sem mapping também devem ser bloqueados nas rotas genéricas.
- REQ-004: A UI deve decidir ações integradas por `hasChannelMapping`, com fallback conservador para origem externa.
- REQ-005: Aceite integrado deve continuar por comando externo e ativar o pedido local uma única vez após confirmação do adapter.
- REQ-006: Confirmação integrada deve baixar estoque e reservar ticket exatamente uma vez.
- REQ-007: Eventos e estados devem usar as transições canônicas do domínio.
- REQ-008: Origens manuais `counter`, `whatsapp` e `olaclick` continuam aceitas na rota manual.

## Restrições

- CON-001: Não criar mapping implícito nem migrar/destruir legado automaticamente.
- CON-002: Não mover comportamento de canal para a UI.
- CON-003: Não reescrever adapters.
- CON-004: Bloqueio deve ocorrer sem pedido, estoque, financeiro, ticket, evento ou registro idempotente.

## Casos extremos

- EDGE-001: Payload manual externo com chave nova retorna `400` e não consome a chave.
- EDGE-002: Pedido mapeado com origem manual continua integrado por causa do mapping.
- EDGE-003: Pedido externo legado sem mapping falha fechado.
- EDGE-004: Replay/concorrência do aceite não duplica baixa ou ticket.
- EDGE-005: Origem manual válida não muda de contrato.

## Definição de concluído

- DONE-001: Testes unitários/UI cobrem classificação por mapping e fallback.
- DONE-002: Teste HTTP/PostgreSQL prova rejeição manual externa sem efeitos.
- DONE-003: Teste HTTP/PostgreSQL prova bloqueio de status mapeado e legado.
- DONE-004: Teste integrado prova uma baixa e um ticket sob replay.
- DONE-005: Gates gerais, smoke e documentação passam.
