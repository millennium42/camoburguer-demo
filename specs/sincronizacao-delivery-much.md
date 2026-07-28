# Sincronização Delivery Much

## Limite de contrato

O contrato privado/sandbox não está disponível. A implementação permanece atrás de `DELIVERYMUCH_ENABLED=false` e congela somente os estados já representados pelo adapter atual. Isso é prova local com fixtures, não homologação do parceiro.

## Requisitos exatos

- REQ-001: Estados aceitos são `pending/new/received`, `accepted/confirmed`, `preparing/in_preparation`, `ready` e `cancelled/canceled`.
- REQ-002: Estado desconhecido é persistido como bloqueado e coloca mapping em `reconciliation_required`.
- REQ-003: Dedupe usa versão/updatedAt externa quando disponível e, sempre, SHA-256 canônico do payload.
- REQ-004: Mudança de item, quantidade, valor ou endereço com mesmo status gera novo evento e reconciliação manual, sem reescrever venda.
- REQ-005: Transições são monotônicas; evento atrasado não regride.
- REQ-006: Aceite ativa uma vez; preparo/pronto/cancelamento reutilizam invariantes do domínio.
- REQ-007: Estoque e ticket são exatamente uma vez por constraints e estado.
- REQ-008: HTTP de polling permanece fora da transação.

## Restrições

- CON-001: Não inventar endpoint, payload ou estado além da fixture local.
- CON-002: Adapter continua desligado em configuração versionada.
- CON-003: Conflito comercial nunca atualiza silenciosamente o pedido.

## Casos extremos

- EDGE-001: Payload igual repetido deduplica.
- EDGE-002: Mesmo status com payload diferente é detectado.
- EDGE-003: Cancelamento repetido não duplica estoque.
- EDGE-004: Evento fora de ordem não regride.

## Definição de concluído

- DONE-001: Testes de fixture cobrem matriz, desconhecido, repetição e conflito.
- DONE-002: PostgreSQL prova estoque/ticket exatamente uma vez.
- DONE-003: Limite de homologação e rollback são documentados.
- DONE-004: Gates passam.
