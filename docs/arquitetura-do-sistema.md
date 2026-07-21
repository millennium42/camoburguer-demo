# Arquitetura do Sistema

`service_tabs` é o agregado comercial de consumo local. `orders` permanece o núcleo operacional e representa cada rodada enviada à cozinha; o vínculo é opcional para preservar os quatro canais externos. O frontend reutiliza o mesmo carrinho e apenas troca o endpoint de confirmação quando existe comanda ativa.

`stock_balances` guarda o estado mínimo das três categorias e `stock_movements` guarda a trilha append-only. A baixa faz parte da mesma transação que cria `orders` e `print_jobs`, portanto a cozinha nunca recebe ticket de item sem saldo confirmado.

`tab_payments` compõe o saldo financeiro da comanda em centavos e preserva parcelas/estornos como eventos append-only. Cada parcela gera um `finance_entries` ligado por `tab_id` e `payment_id`; somente dinheiro atualiza o esperado do turno. O ciclo financeiro da comanda é independente do ciclo de preparo das rodadas.

## Apps

- `apps/api`: núcleo HTTP, domínio, persistência, SSE e automações
- `apps/ops-web`: interface operacional leve
- `apps/print-bridge`: bridge de impressão com spool em arquivo
- `apps/event-simulator`: semeador opcional para demo

## Packages

- `packages/shared-types`: enums e contratos compartilhados
- `packages/domain`: regras e transições de pedido e caixa
- `packages/finance-core`: lançamentos e agregações financeiras

## Infra

- `docker compose`
- PostgreSQL
- volume de spool para impressão

## Decisões

- núcleo único de pedidos
- frontend estático e leve
- backend em Node com Fastify
- finance gerencial e dirigido por evento
- adapters iFood/Delivery Much atrás de feature flags e ainda dependentes de homologação

## Fluxo operacional obrigatório

```mermaid
flowchart LR
  MANUAL["Balcão, WhatsApp e OlaClick manual"] -->|"POST /orders"| API["API Fastify"]
  CHANNELS["iFood / Delivery Much"] --> ADAPTERS["Adapters com polling"]
  ADAPTERS --> EVENTS[("channel_events")]
  EVENTS --> API
  UI["ops-web: rascunho local"] -->|"POST /tabs/:id/rounds + Idempotency-Key"| API
  API --> DOMAIN["Domínio: catálogo, adicionais, descontos e totais"]
  API --> TX["Transação da rodada"]
  TX --> STOCK[("stock_balances + movements")]
  TX --> ORDERS[("orders: rodada + estado")]
  TX --> JOB["print_job idempotente"]
  ORDERS --> KITCHEN["Fila da cozinha + SSE"]
  JOB --> BRIDGE["print-bridge"]
  BRIDGE --> SPOOL[("Spool local/volume")]
  UI -->|"parcelas/estornos"| PAYMENTS[("tab_payments")]
  PAYMENTS --> FINANCE[("finance_entries")]
  ORDERS -->|"order.completed"| FINANCE
  FINANCE --> SUMMARY["Resumo/lista com os mesmos filtros"]
```

- `Finalizar pedido` não limpa o carrinho antes de a API confirmar sucesso. Repetir a mesma finalização deve devolver o mesmo pedido, sem duplicar itens, impressão ou lançamento financeiro.
- O frontend não envia nem exibe operador: isso é uma limitação deliberada da demo e bloqueia o uso com dados reais até existir autenticação/autorização.
- `fulfillment` aceita apenas `delivery`, `pickup` e `local`. Endereço é obrigatório somente para `delivery` e deve ser ocultado/ignorado nos demais modos.
- A cozinha recebe somente pedidos confirmados. O horário impresso é o `createdAt` persistido no pedido, nunca o horário local da impressora.
- Rodadas de produção e cancelamento são novos `orders`; `reverses_order_id` referencia a origem, sem `UPDATE` destrutivo no ticket já emitido.
- A baixa de estoque, o pedido e o `print_job` compartilham a transação. Qualquer insuficiência aborta o conjunto inteiro.
- O saldo comercial da comanda deriva das rodadas menos cancelamentos e das parcelas menos estornos; nenhum total mutável paralelo é fonte de verdade.

## Modelo de persistência consolidado

| Agregado/tabela | Responsabilidade | Regra de integridade principal |
| --- | --- | --- |
| `service_tabs` | identidade e ciclo comercial de comanda/mesa | um identificador normalizado por comanda aberta |
| `orders` | rodada de produção ou cancelamento | número sequencial por comanda e linhas estáveis |
| `stock_balances` | saldo corrente das três categorias | quantidade nunca negativa |
| `stock_movements` | auditoria de carga, ajuste, venda e reversão | efeito idempotente e vínculo ao pedido quando aplicável |
| `tab_payments` | parcelas e compensações em centavos | valor positivo, saldo não excedido e original preservado |
| `finance_entries` | livro gerencial de venda, caixa e pagamento | vínculo opcional a comanda/parcela e lançamento append-only |
| `print_jobs` | entrega recuperável do ticket | um job por efeito e spool idempotente |

## Caixa

- A API é a fonte de verdade do estado do caixa: `closed -> open -> closed`.
- Abrir quando já existe caixa aberto e fechar caixa fechado são conflitos de estado; a UI apenas reflete essa regra e desabilita ações inválidas.
- Reforço e sangria são ajustes de um caixa aberto. O formulário pode ser um diálogo acionado por `Adicionar movimentação`; não constitui um módulo próprio.

## Fronteiras e seams

- `apps/ops-web`: mantém somente estado efêmero de formulário/carrinho e apresenta estados vindos da API.
- `apps/api`: controla idempotência, transações, estado do caixa, confirmação e emissão de eventos.
- `packages/domain`: valida estados e invariantes puras de pedido e caixa.
- `packages/finance-core`: deriva lançamentos de eventos confirmados, sem depender da interface.
- `apps/print-bridge`: recebe o contrato estável do ticket e grava spool idempotente por `jobId`, sem consultar ou alterar pedidos. A API recupera jobs interrompidos na inicialização e repete falhas periodicamente.
- Novos canais entram por adapters que normalizam para o mesmo comando de pedido; não criam fluxos paralelos na UI ou no domínio.

## Fronteira de integração externa

- `channel_events` deduplica o evento bruto do parceiro.
- `channel_mappings` liga merchant/pedido externo ao único `order` local e expõe estado de sincronização.
- `channel_commands` funciona como outbox de aceite, cancelamento, preparo e pronto.
- O poller usa advisory lock por canal para evitar duas execuções simultâneas.
- No iFood, persistência/processamento local fazem commit antes do ACK. Evento repetido é reconhecido e novamente confirmado sem duplicar pedido.
- Credenciais e payloads reais ainda não foram homologados. Feature flags devem permanecer desligadas fora de sandbox.

## Fronteira de segurança

- CORS usa allowlist; isso controla navegador, não acesso à API.
- Seed e anonimização exigem `DEMO_ADMIN_TOKEN` e ficam desabilitados sem segredo.
- API e print bridge usam `PRINT_BRIDGE_TOKEN`; o bridge valida bearer, IDs e tamanho do ticket.
- As rotas operacionais e SSE ainda não têm identidade de operador. Esta é uma pendência P0 antes de qualquer integração real.

## Eventos internos

- `order.created`, `order.confirmed`, `order.completed`, `order.cancelled`
- `ticket.printed`, `ticket.print.failed`
- `cash.shift.opened`, `cash.adjustment.created`, `cash.shift.closed`
- `finance.entry.created`

## Riscos arquiteturais

- Finalização dividida em várias chamadas do frontend pode deixar pedido persistido sem confirmação/cozinha; a operação deve ser atômica na API.
- Confiar no estado do caixa mantido pela UI permite abertura duplicada e fechamento inválido; a restrição deve ser transacional no backend/DB.
- Gerar horário no print-bridge causa divergência entre operação e ticket; `createdAt` deve atravessar o contrato sem recomputação.
- Acoplar regras de delivery ou canal aos componentes visuais multiplica exceções; a UI coleta dados e a API valida o contrato normalizado.
- Hospedar o bridge no Render não alcança a impressora da LAN e o filesystem do serviço pode ser efêmero; produção exige um agente local autenticado.
