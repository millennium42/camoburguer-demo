---
tags: [contexto, operacional]
---

# Contexto Operacional — Camoburguer Demo

> Sistema de operação para pedidos, cozinha, caixa e integrações externas de um
> restaurante de pequeno porte. Esta versão é uma **demo** com dados sintéticos e
> sem autenticação de operador — isso bloqueia integrações reais até que os gates
> de produção estejam cumpridos.

---

# Guia de uso

## Resumo do negócio

O Camoburguer opera como restaurante de pequeno porte com pedidos vindos de
balcão, WhatsApp, iFood, OlaClick e delivery manual. Hoje esses pedidos são
anotados manualmente e levados para a cozinha. A v1 desta demo substitui esse
fluxo por um núcleo único de pedidos com emissão padronizada de ticket para a
cozinha.

O cardápio local é um snapshot versionado do OlaClick capturado em 2026-07-16.
A aplicação não depende da disponibilidade do marketplace para operar; preços
novos exigem atualização explícita do snapshot.

## Atores e responsabilidades

| Ator | Responsabilidade na demo |
|---|---|
| Operador | Atendimento, lançamento de pedidos, caixa e estoque — sem login ou perfil nesta versão |
| Cozinha | Recebe pedidos finalizados pela fila e pelo ticket impresso |
| Cliente final | Não acessa a aplicação nesta versão |

- **Trava:** a demo considera uma única pessoa responsável pelo atendimento e
  caixa, sem login, perfil administrativo ou identificação de operador. Essa
  simplificação só é aceitável com dados sintéticos e bloqueia integrações reais
  até existir controle de acesso.

## Problemas operacionais que a demo resolve

- Múltiplos canais sem unificação operacional
- Erro humano em anotações e repasse de pedido
- Falta de rastreio simples por status
- Dificuldade de acompanhar caixa e recebimentos por canal ou forma de pagamento

## Objetivos da demo

- Centralizar pedidos em um aplicativo simples
- Emitir ticket direto para cozinha
- Exibir fila operacional clara
- Registrar financeiro gerencial automaticamente a partir dos eventos do pedido
  e do fechamento de caixa

## Consumo local (comandas e mesas)

- Comanda e mesa são duas apresentações do mesmo agregado comercial `service_tabs`
  e usam identificador livre obrigatório.
- Não há cadastro fixo nem mapa de mesas; apenas identificadores abertos são
  exclusivos após normalização.
- O carrinho é rascunho editável. Cada envio confirmado vira uma rodada imutável
  e um ticket independente para a cozinha.
- Correções posteriores não reescrevem o ticket original: geram cancelamento
  auditável e, quando necessário, uma nova rodada de produção.
- A comanda fecha somente com saldo financeiro exatamente zerado; o ciclo da
  cozinha continua independente.

## Responsabilidades do operador na v1

- Carregar e ajustar os saldos iniciais de Xis, Dog e Hambúrguer; o sistema nunca
  inventa estoque real.
- Registrar cada parcela de pagamento e conferir o saldo antes de encerrar a comanda.
- A retirada de numerário é apresentada como "Retirada (sangria)" e não compõe
  faturamento.
- Adicionais são snapshots comerciais no item; não possuem estoque individual
  nesta versão.

## Integrações externas e fila de autorização

- **Design System:** paleta quente de operação (`creme`, `âmbar`, `marrom`) com
  superfícies claras, contraste alto, tipografia dupla (`Outfit` para títulos e
  `IBM Plex Sans` para operação). Contrato vivo em [DESIGN.md](DESIGN.md).
- **Autorização de integrações:** pedidos de canais externos (iFood, Delivery Much)
  não entram diretamente na fila da cozinha. Ficam estacionados em uma **Fila de
  Autorização** onde o operador deve explicitamente Aceitar ou Recusar o pedido,
  mantendo controle total da aceitação sem impactar estoque ou impressoras
  prematuramente.

---

# Guia de desenvolvimento

## Fronteiras de segurança

- CORS usa allowlist; isso controla navegador, não acesso à API.
- API e SSE usam sessão opaca em cookie `HttpOnly`, `Secure` e `SameSite=Strict`,
  com RBAC `admin`/`operator`/`kitchen` e CSRF vinculado à sessão.
- Seed e anonimização exigem sessão `admin`; o primeiro administrador é criado
  uma única vez por `ADMIN_BOOTSTRAP_PASSWORD`.
- Rotas não classificadas falham fechadas e mutações autenticadas registram o
  identificador do ator em `audit_events`.

## Estado declarado (2026-07-21)

- **Demo local:** aprovada — 36/36 testes, smoke E2E com quatro origens.
- **Deploy público:** pode estar em versão anterior ao `HEAD`; comprovar versão
  antes de diagnosticar.
- **iFood/Delivery Much:** adapters implementados atrás de feature flags, sem
  homologação real.
- **Produção:** bloqueada — autenticação de operador, migrations versionadas,
  sandbox e impressão física são gates obrigatórios.

## Próximo passo crítico

Autenticar e autorizar o posto operacional/API/SSE antes de conectar qualquer
canal real. Detalhes dos gates em [deploy-e-infraestrutura.md](deploy-e-infraestrutura.md).

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[canais-e-captura.md](canais-e-captura.md) ·
[guia-de-desenvolvimento.md](guia-de-desenvolvimento.md)
