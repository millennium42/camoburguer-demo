# Tratar adapter de integração desligado

## Decisão

Usar modo real fail-closed. Não existe simulação implícita.

## Requisitos exatos

- REQ-001: Com adapter desligado, qualquer comando do canal retorna `503 ADAPTER_DISABLED`.
- REQ-002: A recusa ocorre antes de criar comando ou alterar `sync_status`.
- REQ-003: A UI mostra a falha real e não comunica aceite/cancelamento.
- REQ-004: Simulação não é ativada automaticamente em demo, seed, restart ou produção.
- REQ-005: Endpoint administrativo de diagnóstico mostra flags e contagens de comandos não terminais.
- REQ-006: Habilitar adapter continua exigindo todas as credenciais e falha cedo.

## Restrições

- CON-001: Não consumir comando antigo enquanto adapter estiver desligado.
- CON-002: Não inventar credenciais nem homologação.

## Casos extremos

- EDGE-001: Restart mantém modo off.
- EDGE-002: Timeout do cliente não deixa novo comando pendente.
- EDGE-003: Canal desconhecido falha fechado.

## Definição de concluído

- DONE-001: Testes HTTP cobrem 503 e ausência de efeitos.
- DONE-002: Diagnóstico cobre pendentes legados.
- DONE-003: Configuração e UI são testadas.
- DONE-004: Gates passam.
