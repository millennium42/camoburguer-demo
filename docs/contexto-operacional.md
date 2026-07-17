# Contexto Operacional

O cardápio local é um snapshot versionado do OlaClick capturado em 2026-07-16. A aplicação não depende da disponibilidade do marketplace para operar; preços novos exigem atualização explícita do snapshot.

## Resumo

O Camoburguer opera como restaurante de pequeno porte com pedidos vindos de balcão, WhatsApp, iFood, OlaClick e delivery manual. Hoje esses pedidos são anotados manualmente e levados para a cozinha. A v1 desta demo substitui esse fluxo por um núcleo único de pedidos com emissão padronizada de ticket para cozinha.

## Responsabilidade operacional

- A demo considera uma única pessoa responsável pelo atendimento e caixa, sem login, perfil administrativo ou identificação de operador.
- A cozinha recebe os pedidos finalizados pela fila e pelo ticket impresso.
- O cliente final não acessa a aplicação nesta versão.

## Problemas atuais

- Múltiplos canais sem unificação operacional
- Erro humano em anotações e repasse de pedido
- Falta de rastreio simples por status
- Dificuldade de acompanhar caixa e recebimentos por canal ou forma de pagamento

## Objetivo da demo

- Centralizar pedidos em um aplicativo simples
- Emitir ticket direto para cozinha
- Exibir fila operacional clara
- Registrar financeiro gerencial automaticamente a partir dos eventos do pedido e do fechamento de caixa
