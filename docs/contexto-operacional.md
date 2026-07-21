# Contexto Operacional

O cardápio local é um snapshot versionado do OlaClick capturado em 2026-07-16. A aplicação não depende da disponibilidade do marketplace para operar; preços novos exigem atualização explícita do snapshot.

## Resumo

O Camoburguer opera como restaurante de pequeno porte com pedidos vindos de balcão, WhatsApp, iFood, OlaClick e delivery manual. Hoje esses pedidos são anotados manualmente e levados para a cozinha. A v1 desta demo substitui esse fluxo por um núcleo único de pedidos com emissão padronizada de ticket para cozinha.

## Responsabilidade operacional

- A demo considera uma única pessoa responsável pelo atendimento e caixa, sem login, perfil administrativo ou identificação de operador. Essa simplificação só é aceitável com dados sintéticos e bloqueia integrações reais até existir controle de acesso.
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

## Consumo local

- Comanda e mesa são duas apresentações do mesmo agregado comercial `service_tabs` e usam identificador livre obrigatório.
- Não há cadastro fixo nem mapa de mesas; apenas identificadores abertos são exclusivos após normalização.
- O carrinho é rascunho editável. Cada envio confirmado vira uma rodada imutável e um ticket independente para a cozinha.
- Correções posteriores não reescrevem o ticket original: geram cancelamento auditável e, quando necessário, uma nova rodada de produção.
- A comanda fecha somente com saldo financeiro exatamente zerado; o ciclo da cozinha continua independente.

## Responsabilidades adicionais da v1

- O operador carrega e ajusta os saldos iniciais de Xis, Dog e Hambúrguer; o sistema nunca inventa estoque real.
- O operador registra cada parcela de pagamento e confere o saldo antes de encerrar a comanda.
- A retirada de numerário é apresentada como “Retirada (sangria)” e não compõe faturamento.
- Adicionais são snapshots comerciais no item; não possuem estoque individual nesta versão.

## Evoluções da Interface e Integrações
- **Design System:** A aplicação adota o tema nativo "Black & Brown" focado em ergonomia visual para ambientes de baixa iluminação, combinando alto contraste com micro-interações via glassmorphism.
- **Autorização de Integrações:** Os pedidos de canais externos (iFood, Delivery Much) não entram diretamente na fila da cozinha. Eles são estacionados em uma **Fila de Autorização** onde o operador deve explicitamente Aceitar ou Recusar o pedido, mantendo o controle total da aceitação sob demanda sem impactar o estoque ou impressoras prematuramente.
