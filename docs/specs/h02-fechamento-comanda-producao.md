# Especificação H-02: Impedir Fechamento de Comanda com Produção Pendente

## 1. Problema e Evidências
Atualmente, o manipulador de `POST /tabs/:tabId/close` no backend valida se `tab.balanceCents === 0` (quitação financeira) e, caso verdade, executa um `UPDATE` no PostgreSQL transformando irreversivelmente todas as rodadas nos estados `confirmed`, `in_preparation` ou `ready` diretamente para `completed`.  
**Consequência de falha:** Ordens impressas e enviadas para a tela da cozinha em `confirmed` ou `in_preparation` são apagadas da fila de produção antes mesmo de serem finalizadas pela cozinha, apenas porque o cliente pagou a conta antecipadamente no balcão.

## 2. Comportamento Atual vs Desejado
**Atual:**
- Cliente faz pedido na mesa (entra na cozinha como `confirmed`).
- Cliente levanta, paga a conta inteira (saldo zera).
- Operador encerra a comanda na interface.
- Sistema autoriza, fecha a comanda, converte pedido da cozinha em `completed`. O chapeiro perde o ticket na tela.

**Desejado:**
- Cliente faz pedido na mesa.
- Cliente levanta, paga a conta inteira (saldo zera).
- Operador tenta encerrar a comanda: o sistema REST e o Banco rejeitam a mutação, e a UI exibe o motivo (produção pendente).
- O pedido prossegue seu ciclo na cozinha e chega em `ready`.
- Somente a partir de então (`balanceCents === 0` && `!pendingProduction`) a comanda pode ser encerrada. Somente as rodadas `ready` se convertem para `completed`.

## 3. Invariantes de Domínio e Segurança
1. O fechamento financeiro de uma comanda (`closed`) não pode suprimir, ocultar ou acelerar indevidamente o ciclo operacional de preparo (Cozinha).
2. A atualização atômica de rodadas no fechamento apenas afeta estados previamente maduros (`ready`). Rodadas em `confirmed`, `in_preparation` e `received` bloqueiam o fechamento.

## 4. Estados e Transições Afetadas
- Bloqueadores do fechamento da comanda: Estados da rodada em `received`, `confirmed` e `in_preparation`.
- Autorizadores do fechamento (ignorados para contagem pendente): `ready`, `completed`, `cancelled`.
- Transição SQL no encerramento de comanda (`/tabs/:tabId/close`): O update em `orders` filtrará exclusivamente pelas rodadas onde `status = 'ready'`.

## 5. Contratos HTTP e de Persistência
**Retorno 409 (Erro Estruturado de Concorrência e Regra de Negócio):**
```json
{
  "code": "TAB_PRODUCTION_PENDING",
  "message": "Existem rodadas aguardando preparo na cozinha. Não é possível encerrar a comanda.",
  "pendingRounds": [
    { "id": "uuid", "status": "confirmed", "roundNumber": 1 }
  ]
}
```

## 6. Arquivos e Símbolos
- `apps/api/src/server.js`: Modificar a rota `POST /tabs/:tabId/close` (L1419+) para inspecionar `view.rounds` quanto a itens bloqueadores, retornar HTTP 409, e mudar o SQL de `completed` para atuar unicamente sobre `ready`.
- `apps/ops-web/main.js`: Modificar `renderTabs()` para injetar o atributo estático `disabled` e `title` descritivo na DOM ao desenhar cartões de comandas zeradas que possuem `pendingRounds`. Modificar tratamento do erro global em `notify`.
- `tests/smoke.mjs`: Patch de `preparationMode: 'direct_handoff'` nos itens sintéticos de testes financeiros para não bloquearem falsamente a suíte de smoke.
- `tests/h02-tab-close.test.js` (Novo): Casos-limite focados, matrizes e teste de transações abordando exclusivamente o fluxo da comanda (invariante 1 e 2).

## 7. Estratégia de Migração e Compatibilidade
Não há quebra de migrações estruturais do banco (schema mantido). O frontend consumirá a nova semântica da DOM por processamento local na renderização. 

## 8. Testes (Unitário, Integração, Concorrência)
1. **Matriz:** Fechar com saldo zerado e rodada `confirmed` (falha).
2. **Matriz:** Fechar com saldo zerado e rodada `in_preparation` (falha).
3. **Matriz:** Fechar com saldo zerado e TODAS `ready` (sucesso, fechamento atômico).
4. **Rollback e Transacionalidade:** Garantir que erro não consolida mudança nenhuma.
5. **Concorrência:** Se uma request concorrente abrir uma rodada enquanto a comanda fecha, a validação no preflight deve capturar ou os locks do PG devem repelir (Testes em `h02`).
6. **Interface:** Botão inacessível e aviso na UI sem estourar layouts (testado sinteticamente ou render test).

## 9. Riscos, Rollback e Fora de Escopo
- **Risco:** Comandas legadas esquecidas em `confirmed` podem não conseguir fechar. 
- **Fora de Escopo:** Não implementaremos um fluxo de "forçar fechamento cancelando itens da cozinha". Se a loja desejar forçar, ela deve estornar e cancelar o item explicitamente pela regra de negócio via tela.
- **Rollback:** Retornar os arquivos via `git revert`.

## 10. Rubrica de Autoavaliação Congelada (100 pontos)

| Critério | Pontos | Como será medido |
|---|---:|---|
| Correção funcional e preservação dos invariantes | 30 | `tabs/close` expurga rodadas pendentes e falha o fechamento. |
| Testes de regressão, integração e casos-limite | 20 | Suíte `h02-tab-close.test.js` atende matrizes e rollback. |
| Segurança, integridade transacional e concorrência | 15 | Locks e validação antecedem mutações ao PG, impedindo vazamentos. |
| Aderência integral à especificação | 15 | Payload `409 TAB_PRODUCTION_PENDING` não vaza SQL/dados e instrui. |
| Qualidade de código, clareza e manutenibilidade | 10 | Javascript claro e vanilla UI compatível com Web Design Guidelines. |
| Operação, observabilidade, documentação e rollback | 5 | Mensagens inteligíveis e log local consistente no `smoke.mjs`. |
| Disciplina de escopo, commit e reprodutibilidade | 5 | Apenas arquivos alvo alterados; 1 commit seguindo convenção H-02. |
