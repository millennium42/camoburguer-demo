---
tags: [dominio, estoque]
---

# Estoque por Categoria — Camoburguer Demo

> A v1 controla unidades prontas para venda em três categorias fixas. Escalar
> para ingredientes ou receitas exige um novo modelo e está fora desta versão.
> Não introduzir novas categorias ou controle de ingrediente sem decisão explícita.

---

# Guia de uso

## Escopo da v1

Categorias controladas: `xis`, `dog` e `hamburguer`.

**Fora de escopo:** bebidas, fritas, adicionais e ingredientes — não entram
neste saldo.

- Cada categoria inicia em zero; a quantidade real é informada por carga inicial
  auditada pelo operador.
- A linha do pedido congela `stockCategory` no momento da confirmação. Editar,
  pausar ou arquivar o item do catálogo depois da venda não altera baixa ou
  restituição histórica.
- Pedidos legados sem esse campo usam somente o snapshot base como fallback.

## Fluxo de operação

1. **Carga inicial:** entrada ou retirada manual exige inteiro, motivo e
   `Idempotency-Key`.
2. **Confirmar pedido externo ou enviar rodada:** a API agrega os itens por
   categoria.
3. **Transação:** saldo é bloqueado e atualizado na mesma transação do pedido e
   do print job.
4. **Insuficiência:** responde `409` e reverte pedido, movimento e impressão.
5. **Retry:** recupera o pedido existente e não baixa novamente.
6. **Cancelamento antes de `in_preparation`:** restitui as unidades canceladas
   uma vez.
7. **Cancelamento após início do preparo:** não repõe estoque; operador registra
   ajuste manual após conferir perda ou reaproveitamento.

---

# Guia de desenvolvimento

## Corte de migração

Pedidos que já estavam no banco antes da criação de `stock_movements` não geram
saldo retroativo. Por isso, o cancelamento automático só restitui uma categoria
quando encontra o movimento `sale` original daquela mesma rodada e categoria.

- **Trava:** essa regra impede que pedidos legados criem estoque fictício.
  A carga inicial continua sendo uma decisão explícita do operador.

## Auditoria e invariantes

`stock_movements` é append-only e registra: categoria, delta, motivo, pedido,
chave idempotente, metadados e data.

Constraints obrigatórios:
- Saldo nunca negativo.
- Delta nunca zero.
- Categoria desconhecida rejeitada.
- Efeito duplicado por pedido/categoria/motivo rejeitado.
- A mesma `Idempotency-Key` manual só pode repetir exatamente categoria, delta e
  motivo; payload diferente responde `409`, inclusive sob corrida entre categorias.

## Locks e ordem determinística

Baixa, pedido e `print_job` compartilham a mesma transação. Locks são obtidos em
ordem determinística para evitar deadlock entre categorias concorrentes.

## Aceito conscientemente na v1

- Sem controle de ingrediente, ficha técnica ou CMV por receita.
- Adicionais não possuem estoque individual.
- O painel exibe "Estoque de pães" como rótulo visual; isso não cria nova
  categoria — a v1 ainda controla apenas `xis`, `dog`, `hamburguer`.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[ciclo-do-pedido.md](ciclo-do-pedido.md) ·
[padrao-ticket-cozinha.md](padrao-ticket-cozinha.md)
