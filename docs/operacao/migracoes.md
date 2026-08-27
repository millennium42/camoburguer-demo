# Migrações e rollback de teste

O schema está em `apps/api/migrations/001_initial_schema.up.sql`. O runner SQL
usa `pg`, ledger `schema_migrations`, checksum SHA-256 e advisory lock. Todas as
pendências e seus registros são atômicos. O boot e a CLI usam o mesmo runner;
catálogo e estoque zero continuam sendo referências, sem semear pedidos/caixa.

## Operação

Forneça `DATABASE_URL` pelo ambiente/arquivo `.env` protegido. Não imprima a URL
nem versione credenciais. Para aplicar pendências: `rtk npm run migrate:up`.
Reexecutar é um no-op; versão desconhecida, ordem divergente ou checksum alterado
impedem a execução. Não edite uma migration aplicada: crie a próxima versão no
manifest de `apps/api/src/migrations.js` e seus arquivos UP/DOWN.

Faça backup validado antes de mudar banco operacional. O plano de recuperação
externa/PITR está em [execucao-bloco-2.md](../execucao-bloco-2.md).

## DOWN é exclusivamente para testes

`rtk npm run migrate:down -- --confirm-database=camoburguer_exemplo_test`
exige `APP_ENV=test`, conexão PostgreSQL loopback em 5432/55432 e confirmação do
nome real. O alvo deve ser um banco efêmero vazio: só ledger e saldos de
referência zerados são permitidos. Um banco inicializado pela API, com catálogo
ou usuários, também será recusado. Não esvazie dados para contornar a proteção.

Cada chamada reverte uma versão. O runner bloqueia as tabelas antes de conferir
o vazio; DDL e ledger são revertidos juntos em caso de falha. Não usa `CASCADE`.
Em produção, prefira correção adiante ou restauração validada em **nova instância**;
nunca execute DOWN destrutivo sobre dados operacionais.

## Verificação reproduzível

Crie um banco de controle vazio chamado `camoburguer_migrations_test` no
PostgreSQL 16.14 local de testes; informe sua URL via
`TEST_MIGRATIONS_DATABASE_URL` e execute `rtk npm run test:migrations`.
O usuário desse servidor efêmero precisa de `CREATEDB`. Cada suíte cria um banco
de nome aleatório, valida identidade e remove apenas o alvo cuja criação
confirmou. O banco de controle não é truncado. Sem a variável, os testes de DB
são explicitamente pulados; os testes unitários de segurança continuam rodando.

Cobertura: primeira aplicação concorrente, reexecução, adoção de legado com
sentinelas, drift, DDL inválido sem ledger parcial, DOWN recusado com dados,
round-trip UP/DOWN/UP e CLI sem exposição de credenciais.

## Relógio de retenção (002)

A primeira transição para `completed` recebe `completed_at` do banco. Replays,
cancelamento posterior e timestamps fornecidos no write não reiniciam o prazo.
Pedidos legados já concluídos usam `GREATEST(created_at, updated_at)`: aproximação
histórica conservadora, não uma entrega reconstituída com precisão. Cancelados
sem evidência de conclusão ficam sem relógio. `privacy_anonymized_at` marca a
aplicação da política; nenhuma destas colunas altera IDs, hashes ou valores.
