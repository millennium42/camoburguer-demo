# Corrigir cancelamento manual na interface

## Requisitos exatos

- REQ-001: Cancelamento integrado é decidido por `hasChannelMapping`, com fallback conservador para origem externa legada.
- REQ-002: Balcão, WhatsApp e OlaClick sem mapping usam somente `PATCH /orders/:id/status`.
- REQ-003: Pedido integrado consulta motivos e chama somente o comando externo.
- REQ-004: `404` de motivos externos não participa do caminho manual.
- REQ-005: Sucesso aparece apenas após resposta HTTP bem-sucedida.
- REQ-006: Botão fica desabilitado durante a operação e tentativa integrada mantém chave até resposta.

## Restrições

- CON-001: Sem redesign ou dependência visual.
- CON-002: DTO deve expor booleano confiável sem quebrar fallback legado.

## Casos extremos

- EDGE-001: Falha/latência não mostra sucesso.
- EDGE-002: Duplo clique não duplica cancelamento.
- EDGE-003: Mapping prevalece sobre origem.

## Definição de concluído

- DONE-001: Teste UI observa roteamento manual versus integrado.
- DONE-002: Teste HTTP valida efeitos e erros.
- DONE-003: Gates gerais passam.
