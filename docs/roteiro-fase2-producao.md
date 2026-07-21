# Roteiro da demo à produção

Este roteiro é ordenado por risco e dependência. Não introduza Redis, fila, Kubernetes ou ficha técnica antes de uma métrica ou requisito provar a necessidade.

## Gate 0 — fechar a exposição pública (P0)

Critérios:

- autenticação real do operador diante de API e SSE;
- autorização separada para seed, anonimização, ajustes, caixa e reprocessamento;
- nenhuma chave embutida no frontend estático;
- auditoria de quem fez cada ação sensível;
- política de sessão, revogação e recuperação documentada;
- teste que prova `401/403` em todas as rotas protegidas.

Opção Ponytail recomendada: colocar o painel e a API atrás de um proxy/identity-aware access já suportado pelo provedor. Se isso não atender identidade por ação, criar um BFF/login pequeno, sem espalhar auth pelo domínio.

## Gate 1 — dados e operação recuperável

- extrair o `schemaSql` para migrations numeradas e testadas em banco vazio e banco legado;
- configurar backup/PITR no PostgreSQL;
- executar e registrar teste de restore;
- separar seed de demo de qualquer ambiente com dados reais;
- criar retenção/anonymização LGPD com aprovação e dry-run;
- padronizar timezone operacional como `America/Sao_Paulo`.

## Gate 2 — homologação iFood

Referências oficiais a reconfirmar na data da implementação:

- [autenticação centralizada](https://developer.ifood.com.br/en-US/docs/guides/modules/authentication/centralized/);
- [polling do módulo Events](https://developer.ifood.com.br/en-US/docs/guides/modules/events/polling-overview/);
- [eventos do módulo Order](https://developer.ifood.com.br/en-US/docs/guides/modules/order/events/).

Plano:

1. obter credenciais de sandbox e merchant de teste;
2. capturar fixtures sanitizadas de token, evento, detalhe e erro;
3. testar polling a cada 30 s, `x-polling-merchants`, duplicata e fora de ordem;
4. provar commit local antes do ACK e retry quando ACK falha;
5. provar aceite, cancelamento, início de preparo e pronto;
6. reconciliar comando `failed` e evento desconhecido;
7. medir lag e taxa de erro;
8. habilitar flag somente no staging.

## Gate 3 — homologação Delivery Much

A referência pública é [Orientações gerais de integração](https://developer.deliverymuch.com.br/specs/orientacoes.pdf); os endpoints detalhados exigem acesso privado.

Plano:

1. obter Postman/OpenAPI/portal oficial do contrato da conta;
2. substituir qualquer endpoint presumido pela rota documentada;
3. congelar fixtures de autenticação, lista, receive/read, accept, ready e cancel;
4. validar moeda, complementos, endereço, retirada e status reais;
5. testar deduplicação `pedido:status`, reentrega e retry;
6. decidir por polling ou webhook conforme o contrato, sem adicionar broker por antecipação;
7. habilitar apenas após sandbox e reconciliação operacional.

## Gate 4 — worker/outbox observável

O poller em processo serve à demo. Separá-lo quando pelo menos uma condição ocorrer: múltiplas réplicas, deploy interrompendo polling, lag mensurável, necessidade de reprocessamento ou SLA do parceiro.

Requisitos mínimos:

- lease/advisory lock por canal;
- outbox persistente para comandos;
- backoff com jitter e limite;
- dead-letter/reprocessamento manual;
- correlação por `channel`, `merchantId`, `externalOrderId`, `eventId`, `commandId`;
- métricas de último poll, lag, ACK, retries e falhas;
- alerta e runbook.

## Gate 5 — impressão real

O bridge em nuvem apenas grava spool remoto. Para cozinha:

1. inventariar impressora/interface/SO/rede;
2. escolher agente local outbound-only autenticado;
3. manter o texto de `buildKitchenTicket()` como contrato;
4. implementar ESC/POS/driver atrás do bridge;
5. provar idempotência, queda de internet, reinício, papel ausente e reprint;
6. documentar contingência manual.

## Gate 6 — release operacional

- CI verde e smoke em ambiente limpo;
- teste visual desktop/390 px;
- sandbox dos dois parceiros aprovado ou flags desligadas;
- carga representativa do pico de jantar;
- dashboards/alertas e plantão definido;
- backup/restore recente;
- checklist de rollback e comunicação;
- aprovação explícita do responsável operacional.

## Depois da estabilização

Somente com demanda comprovada:

- catálogo administrável;
- estoque por ingrediente/ficha técnica;
- fiscal/nota;
- múltiplas lojas/operadores/perfis;
- Redis ou broker;
- scaling horizontal.

Esses itens mudam o produto e não fazem parte do financeiro gerencial v1.
