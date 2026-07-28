# Fingerprint para replay idempotente divergente

## Objetivo

Impedir que a mesma `Idempotency-Key` aceite cargas semanticamente diferentes em pedidos, rodadas e cancelamentos, preservando replay idêntico sem duplicar efeitos.

## Escopo

### Incluído

- Canonicalização, SHA-256, persistência, migração e concorrência.
- Pedidos avulsos, rodadas de comanda e cancelamentos manuais/integrados.
- Testes de replay, divergência, recurso diferente e efeitos derivados.

### Fora do escopo

- Idempotência de ajustes de caixa, redesign de UI e reescrita ampla das integrações.

## Requisitos exatos

- REQ-001: Cada operação deve calcular SHA-256 sobre payload canônico versionado antes da primeira mutação.
- REQ-002: O registro idempotente deve persistir chave, fingerprint, versão canônica, tipo de operação, recurso canônico e resultado suficiente para replay.
- REQ-003: Mesma chave, operação, recurso e fingerprint deve devolver o resultado original sem novo pedido, estoque, financeiro, ticket, evento ou mapping.
- REQ-004: Mesma chave com fingerprint, operação ou recurso divergente deve retornar `409` sem efeitos.
- REQ-005: Canonicalização deve ordenar chaves de objetos, normalizar opcionais ausentes/nulos conforme contrato, dinheiro em centavos exatos e itens/adicionais por identidade sem depender da ordem JSON.
- REQ-006: Campos semânticos incluem origem, cliente, endereço, modalidade, pagamento, dinheiro, itens, quantidades, descontos, notas/motivo, opcionais e identidade do pedido/comanda/recurso aplicáveis.
- REQ-007: Constraint única e transação/lock devem garantir uma operação sob concorrência real.
- REQ-008: Registros legados devem ter fingerprint reconstruído quando inequivocamente possível; caso contrário, reutilização da chave retorna `409 legacy_idempotency_unverifiable`.

## Restrições

- CON-001: Não usar hash do JSON bruto nem `float` para dinheiro.
- CON-002: Não persistir senha, cookie, token, PII dispensável ou payload secreto no registro idempotente.
- CON-003: Migração e rollback não apagam chaves ou resultados existentes.
- CON-004: O contrato atual de pagamentos não pode ser enfraquecido.

## Casos extremos e falhas

- EDGE-001: Ordem diferente de chaves/itens equivalentes produz o mesmo fingerprint.
- EDGE-002: Alterar isoladamente item, quantidade, desconto, motivo ou recurso produz `409`.
- EDGE-003: Duas requisições simultâneas com mesma chave produzem um único efeito e o mesmo resultado.
- EDGE-004: Falha após reservar a chave faz rollback integral ou deixa estado recuperável sem replay divergente.
- EDGE-005: A mesma chave em outro pedido/comanda/recurso retorna `409`.

## Definição de concluído

- DONE-001: Testes unitários cobrem vetores canônicos determinísticos e monetários.
- DONE-002: Testes HTTP/PostgreSQL cobrem replay idêntico e divergente para pedido, rodada e cancelamento.
- DONE-003: Teste concorrente prova exatamente um conjunto de efeitos em pedido, estoque, ticket e eventos persistidos.
- DONE-004: Estratégia de legado, migração e rollback estão documentadas e testadas.
- DONE-005: `npm run check`, `npm test`, smoke seguro, auditoria e `git diff --check` passam.

## Migração, legado e rollback

- A migração é aditiva: `idempotency_records` guarda somente chave, operação, recurso, SHA-256, versão e referência do resultado; não guarda o payload nem PII dispensável.
- Novas operações reservam e completam o registro na mesma transação dos efeitos. Erros de validação após a reserva lançam rollback.
- Chaves legadas são procuradas em `orders`, atribuições, estoque, pagamentos e comandos. Como o payload original e a versão canônica não eram persistidos, esses registros não são inequivocamente reconstruíveis e retornam `409 legacy_idempotency_unverifiable`.
- Rollback de aplicação mantém a tabela e os registros. Não executar `DROP`, backfill destrutivo ou reutilização de chave; a versão anterior deve ser interrompida para evitar writers sem fingerprint.
