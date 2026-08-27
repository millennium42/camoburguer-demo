# Seed administrativo explícito

`POST /admin/seed` é a rota canônica. Exige sessão de administrador, CSRF válido,
`APP_ENV=demo`, `DEMO_SEED_ENABLED=true` e confirmação do alvo real configurado em
`DEMO_SEED_TARGET`. `/demo/seed` é um alias compatível do mesmo handler e mantém
as mesmas proteções; não é uma rota pública.

A CLI `rtk npm run seed:demo -- --confirm-target=HOST:PORT/DATABASE` autentica por
HTTP com `ADMIN_USERNAME`/`ADMIN_PASSWORD` fornecidos pelo ambiente e chama a
rota canônica. Não acessa o banco diretamente. Não imprima nem versione senhas.

O preflight bloqueia as 14 tabelas em uma transação antes de qualquer mutação.
Um turno fechado em `cash_shifts` impede seed, assim como qualquer outro dado
operacional protegido. O seed não é uma ferramenta para limpar operação real.
Recusas preservam integralmente os dados; nunca remova a trava para reexecutar.

O boot não executa seed de operação. `AUTO_SEED` ausente ou `false` é aceito;
qualquer outro valor aborta a inicialização. A migração de schema e o catálogo
de referência não representam seed de pedidos/caixa.

`POST /demo/access` só oferece o login rápido próprio do ambiente demo. O antigo
parâmetro `prepare` não semeia mais nada e `demoPrepared` retorna `skipped`.
Usuários demo continuam sendo preparados para o login, sem alterar os dados
operacionais. Para popular uma instalação vazia, o administrador precisa usar
a operação de seed explicitamente.

Evidências: `tests/seed-demo-safety.test.js` (7 testes) e
`tests/seed-demo-postgres.test.js` (22 testes reais, incluindo RBAC, CSRF, alias,
login sem seed, caixa fechado, concorrência, rollback e boot).
