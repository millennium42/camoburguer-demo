# M-02: Alinhar fingerprint idempotente a toda semântica persistida

## Problema e Evidências
O fingerprint gerado para pedidos (através de `orderFingerprintPayload`) não incluía `roundNumber`, `roundKind` (historicamente) e `status`. Apesar de `roundNumber` e `roundKind` terem sido adicionados recentemente à estrutura, a constante `CANONICAL_VERSION` não foi atualizada. Além disso, `status` (que altera profundamente a semântica de um pedido avulso) ainda está ausente. Isso significa que reenvios com a mesma chave idempotente, mas com campos semânticos ou status alterados, podem gerar o mesmo fingerprint (ou colidir versões passadas) e serem rejeitados silenciosamente ou retornarem respostas antigas indevidamente.

## Comportamento Atual e Desejado
- **Atual**: O fingerprint ignora `status` de pedido e valida operações sob `CANONICAL_VERSION="v1"`. Chaves idempotentes com alterações estruturais não versionadas podem causar comportamentos imprevisíveis ao reprocessar requests.
- **Desejado**: Incluir `status` (junto a `roundNumber` e `roundKind`) no fingerprint. Incrementar a `CANONICAL_VERSION` para `"v2"`. Rejeitar requests repetidos que utilizem `"v1"` no banco, retornando um conflito estruturado (`idempotency_version_mismatch`) para garantir que o cliente refaça a requisição ciente da mudança de algoritmo.

## Invariantes de Domínio e Segurança
- Payloads semanticamente diferentes (ex. `status` divergente, `roundNumber` diferente) geram hashes únicos.
- A versão do fingerprint protege os dados contra algoritmos de hashing defasados.
- Nenhuma chave idempotente "v1" legada será aceita tacitamente sem que o request comprove ser idêntico sob o novo algoritmo "v2".
- Ordem de atributos e chaves aninhadas JSON são normalizadas deterministicamente antes do hash.

## Contratos HTTP e de Persistência
- Na `claimIdempotency`, caso um registro possua `canonical_version` diferente de `v2`, o endpoint retornará `HTTP 409 Conflict` com o body `{ code: "IDEMPOTENCY_VERSION_MISMATCH" }` em vez de silenciar.

## Estratégia de Migração e Compatibilidade
O banco permanecerá inalterado para registros já persistidos. A lógica fará com que qualquer colisão em que a versão do hash no banco seja `"v1"` acione uma rejeição controlada. Não migraremos hashes antigos, pois o payload não está persistido na tabela de idempotência para recalcular o hash de forma confiável e as transações são efêmeras na fila operacional.

## Arquivos e Símbolos Prováveis
- `apps/api/src/idempotency.js`: Alterar `CANONICAL_VERSION`, adicionar `status` no `orderFingerprintPayload`, ajustar fallback em `claimIdempotency`.
- `apps/api/src/server.js`: Ajustar handlers para lidar com o conflito `idempotency_version_mismatch`.
- `tests/idempotency.test.js`: Inserir novos testes para `status` e para colisão de versão `"v1"` vs `"v2"`.

## Critérios de Aceitação Verificáveis
1. Mudança no `status` gera fingerprint diferente.
2. `roundKind` ou `roundNumber` diferente gera fingerprint diferente.
3. Requests com mesma chave idempotente e mesma assinatura v2 operam normalmente.
4. Requests reprocessados com `canonical_version='v1'` (mockado no banco) retornam `409` imediato e explícito, informando versão mismatch.
5. Os testes cobrem limites numéricos e monetários determinísticos.

## Rubrica de Autoavaliação (100 pontos)
| Critério | Pontos |
|---|---:|
| Correção funcional e preservação dos invariantes | 30 |
| Testes de regressão, integração e casos-limite | 20 |
| Segurança, integridade transacional e concorrência | 15 |
| Aderência integral à especificação | 15 |
| Qualidade de código, clareza e manutenibilidade | 10 |
| Operação, observabilidade, documentação e rollback | 5 |
| Disciplina de escopo, commit e reprodutibilidade | 5 |
