# H-06: Auditoria Transacional Útil

## Problema e Evidências
Atualmente a auditoria do sistema reside em `app.addHook("onResponse", ...)`, gravando de forma assíncrona o log após o término do request.
Se o evento da mutação tiver sucesso e o insert de auditoria falhar (ex: queda de rede, deadlock no pool), o negócio muda de estado sem deixar rastro. Adicionalmente, a estrutura não guarda as mutações de payload, o que reduz seu valor real (só registra `action` rasas como o HTTP Method, e não o delta da mutação).

## Comportamento Atual vs Desejado
- **Atual:** Assíncrono no `onResponse`, vulnerável a falha silenciosa, salva apenas `actor_id`, `action` (e.g. POST), `resource_path`.
- **Desejado:** Síncrono (transacional com o negócio), seguro por `idempotency_key` impedindo duplicados, salvando ação semântica (e.g. `order.status_patched`), `state_before` e `state_after` devidamente sanitizados, rejeitando armazenar credenciais ou PI.

## Invariantes de Domínio e Segurança
1. A gravação de log falha `->` transação principal sofre ROLLBACK.
2. Nenhuma credencial (password, csrf, tokens, bearers) entra no log JSONB.
3. Eventos idempotentes (replay) não podem gerar log redundante (coberto pelo desvio onde log é inserido apenas se `!claim.repeated`).
4. Endpoints abertos ou queries de telemetria sem ator persistente não exigem auditoria rigorosa (embora o hook de read ainda possa manter observabilidade leve opcional).

## Estados e Transições Afetadas
Todas as rotas HTTP de mutação (`isMutation() === true`), tais como:
- `POST /orders`
- `PATCH /orders/:id/status`
- `POST /tabs.../cancellations`
- `POST /catalog...`

## Contratos HTTP e Persistência
- `ALTER TABLE audit_events` incluirá as colunas `idempotency_key`, `state_before (jsonb)`, `state_after (jsonb)`.
- Adição de índice parcial ou retenção temporal na busca `GET /audit` (nova política administrativa).

## Estratégia de Migração e Compatibilidade
- Campos legados preexistentes recebem `NULL` nos campos de state, sem necessidade de truncate table.
- A função transacional injetada fará o parsing.

## Testes Unitários e Integração
- **Falha injetada:** Mockar erro no insert da auditoria garantindo que a tabela alvo não gravou os inserts principais de negócio.
- **Sanitização:** Assert contra o body armazenado esperando ausência de `password` e afins.
- **Autorização:** Apenas roles corretas (admin) acessam leitura de auditoria.

## Autoavaliação e Rubrica
| Critério | Pontos |
|---|---:|
| Correção funcional e preservação dos invariantes | 30 |
| Testes de regressão, integração e casos-limite | 20 |
| Segurança, integridade transacional e concorrência | 15 |
| Aderência integral à especificação | 15 |
| Qualidade de código, clareza e manutenibilidade | 10 |
| Operação, observabilidade, documentação e rollback | 5 |
| Disciplina de escopo, commit e reprodutibilidade | 5 |
