---
tags: [dados, entrega-02, evidencias]
---

# Execução do Bloco 2 — dados, recuperação e retenção

## Escopo e solicitação registrada

Solicitação do usuário (2026-08-27):

> complete o Bloco 2 + commmit + push + handoff (se acabar os token em meio a uma execução multiagente/subagentes ao voltar automaticamente continue com os subagentes) Gaste o minimo de tokens possivel CI Remoto Verde Workflow Multiagente Use diferentes modelos e esforços para os subagentes Subagentes mega granulares (para cada micro problema a ser resolvido, passando por extensa revisão) Crie a sequencia de modelos de subagentes vizando diminuir ao minimo o uso do tokens Loop Enginering Extremamente granular uma tarefa por vez com review Workflow Multiagente extremamente granular Commit granular Red -> Green
>
> Registre tudo que disse nesse prompt em documentação para que todo desenvolvimento siga essas recomendações

Complemento: **NUNCA interromper subagentes em andamento, independentemente do tempo**.
Procedimento permanente: [ciclo granular](../workflows/ciclo-granular-red-green.md).

## Checkout e ambiente comprovados

- Trabalho: WSL `/home/millennium42/camoburguer-demo`, branch `codex/bloco-2-dados-recuperacao`.
- Base local `e15e715`, quatro commits adiante de `origin/main` (`c1fc555` no início).
- Preservar as exclusões preexistentes de `patch-h04.mjs`, `patch-tests-h04-fix.mjs`, `patch-tests-h04.mjs`, `patch-types.mjs`; não pertencem a esta entrega.
- Node nativo WSL 22.23.2; CI usa Node 24. Banco de teste isolado: container `camoburguer-bloco2-test`, PostgreSQL 16.14, loopback 55432, database `camoburguer_auto_seed_test`.
- m1nd first-minute retornou `needs_authority`; não inventar autoridade. Fallback: Graphify + código + testes. Graphify não prova funcionamento.

## Critérios de aceite e decisões antes da implementação

| Microbloco | Contrato | Estado |
|---|---|---|
| 2.1 | SQL versionado `001_initial_schema`, ledger/checksum, lock transacional, up/down testados, adoção sem apagar dados | Comprovado no CI de `f0f0633` |
| 2.2 | Sem seed de operação no boot/login público; `POST /admin/seed` admin + CSRF + flags + preflight; caixa fechado bloqueia seed | Comprovado no CI de `f0f0633` |
| 2.3 | TZ America/Sao_Paulo em app/container/DB; teste de virada do dia; dump/restore isolado e prova de PITR do provedor | Pendente; acesso externo necessário |
| 2.4 | Retenção diária executável, dry-run sem writes; dados de clientes de pedidos entregues há mais de 30 dias; hashes, IDs e valores preservados | Pendente |

Migrações: usar SQL + `pg` existente, sem ORM adicional. O ledger é a única fonte de versões; aplicar pendências sob advisory lock, registrar checksum somente na mesma transação do DDL. O init pode chamar o mesmo runner para compatibilidade, nunca manter uma segunda cópia do schema. Catálogo e saldo zero são dados de referência, não seed de pedidos/caixa. Rollback inicial é destrutivo e fica limitado a banco efêmero de teste, com confirmação de identidade e recusa de dados operacionais; nunca `DROP SCHEMA CASCADE`. Produção usa correção adiante ou restauração em outra instância.

Retenção: seleção por pedido terminal e instante de entrega, não busca global por nome. O dry-run apenas conta candidatos. A execução deve preservar vínculos e trilhas de segurança/financeiras, registrar execução idempotente e tratar spool externo com status honesto de limpeza pendente. A política não modifica backups do provedor.

Backups: testar restauração em banco novo isolado. Um dump local **não comprova PITR**. O blueprint atual usa plano Free; a [documentação oficial do Render](https://render.com/docs/postgresql-backups) consultada em 2026-08-27 informa PITR apenas em planos pagos. O conector requer reautenticação; não alterar plano nem gerar custo sem aprovação.

## Registro de agentes e continuidade

| Agente / modelo / esforço | ID | Trabalho |
|---|---|---|
| Nietzsche / gpt-5.6-luna / low | `01a04373-7acd-7ad0-8bfd-f2b0cd9c3eae` | B2-WF-01 documentação; B2-BASE-01 ligação do dispatcher |
| Chandrasekhar / gpt-5.6-terra / high | `01a04377-6d89-7ed0-8646-4734808b79af` | Revisão independente dos mesmos microproblemas |
| Feynman / gpt-5.6-luna / medium | `01a04386-c5f3-79a1-affd-9d216a4c9224` | B2.1-UP: implementação concluída; disponível para retomada |

Escalar implementação delimitada para Luna/medium; Terra/high revisa dados/segurança. Sol/high somente se necessário. Uma escritora por vez; revisores somente leitura. Retomar IDs antes de criar agentes novos. Nenhum agente em andamento pode ser interrompido, encerrado ou substituído por demora.

A sequência usa as capacidades expostas pela ferramenta desta sessão e a
[orientação oficial OpenAI](https://developers.openai.com/api/docs/guides/latest-model)
consultada em 2026-08-27. Não há promessa de economia numérica: usar contexto curto,
reaproveitar agentes e escalar apenas quando a evidência exigir.

## Evidências incrementais

- **B2-WF-01:** AGENTS/SUBAGENTES/workflow documentados; revisão independente aprovada; `git diff --check` aprovado. Sem teste funcional aplicável a documentação.
- **B2-BASE-01 red:** suíte real no banco isolado: 144 testes, 120 passaram, 24 falharam. API não inicia porque factory recebe argumentos posicionais, mas exige `{ db, config }`. Também faltavam bindings `getPrimaryPrintJob`/`mapPrintJob`. Há falhas adicionais de preparação de banco vazio a investigar; não atribuir todas à mesma causa.
- **B2-BASE-01 green:** corrigida ligação do dispatcher; `node --check` aprovado; `tests/seed-demo-postgres.test.js` no PostgreSQL isolado: 21/21, zero skips (130 s).
- **B2-BASE-02:** revisão encontrou quatro bindings usados pelos adapters que o commit `e15e715` removeu. Restaurados antes do poller: `updateOrder`, `changeStock`, `reservePrintJob`, `insertOrder`. Revisão final independente aprovada; suíte de integrações 15/15. Não equivale a homologação real dos parceiros.
- **Primeiro push:** publicado até `df10deae697461f5a52add722628c6c5d41a6cee`, incluindo doutrina, correções de base e 2.1. [CI 33084537242](https://github.com/millennium42/camoburguer-demo/actions/runs/33084537242): unitários, audit e gate migrations passaram; suíte HTTP falhou com `EADDRINUSE` na porta fixa 33436. Não é CI verde; correção da alocação de portas pendente.
- **B2.1-UP concluída:** red do executor: `ERR_MODULE_NOT_FOUND` para `migrations.js`; green reproduzido pelo principal: 9/9 (6 migrações + 3 proteções da fixture), zero skips. SQL extraído idêntico aos 23.300 bytes originais. Revisão Terra/high aprovada após remover `close()` duplicado e proteger cleanup por ownership. Comando: `TEST_MIGRATIONS_DATABASE_URL=.../camoburguer_migrations_test node --test --test-concurrency=1 tests/postgres-fixture.test.js tests/migrations.test.js`. Banco de controle não recebe DML de teste: cada execução cria um banco aleatório próprio e o remove ao final.
- **B2.1-LEGACY concluída:** red reproduzido em outro banco descartável já migrado: M05 falhava na proteção unique (4 passaram, 2 falharam). A fixture agora representa um legado sem ledger em banco próprio; mantém todas as asserções e fecha conexões, sem `DROP TABLE CASCADE` compartilhado. Green 6/6 e revisão Luna/low aprovada.
- **B2.1-H01 concluída:** red inicial com `users` inexistente; corrigida criação com URL e init em fixture própria, sem TRUNCATE compartilhado. Green 10/10; revisão Luna/low aprovada. O filho HTTP é encerrado e aguardado antes de remover seu banco, sem interromper qualquer subagente.
- **B2.1-DOWN concluída:** red confirmou ausência de guarda; green 8/8 UP+DOWN, incluindo falha DDL com rollback integral, round-trip e recusa de banco com dados preservando hash. Revisão Terra/high aprovada. DOWN requer `environment=test`, URL loopback explícita e `confirmDatabase`; confere identidade real e bloqueia tabelas antes da verificação de vazio. Uma versão por chamada, sem `CASCADE`.
- **B2.1-CLI concluída:** red (arquivo ausente), green `npm run test:migrations` 14/14 sem skips, incluindo CLI real UP/DOWN/UP. Revisão Luna/low aprovada; lint dos sete arquivos de código/teste passou. [Runbook de migrações](operacao/migracoes.md). CI ainda pendente.
- **B2.1-CI configurado:** gate UP/DOWN após validar identidade do container, com banco de controle separado; push em `codex/**` também dispara CI, sem exigir merge/deploy. Sintaxe local: 66 arquivos JS aprovados. Execução remota ainda não comprovada.
- **B2.2 concluído localmente:** red confirmou rota canônica não classificada, seed no login público e CLI usando alias. Green: 7/7 safety e 22/22 PostgreSQL/HTTP (sem skips); revisão Terra/high aprovada. Handler administrativo único com alias protegido, login sem seed e caixa fechado preservado. [Runbook](operacao/seed-seguro.md). O banco efêmero local foi recriado antes desta verificação para remover efeitos das antigas fixtures compartilhadas; nenhum banco operacional foi alterado.
- **B2-CI-PORT:** red real no CI `33084537242`: `EADDRINUSE` em porta fixa. Testes agora usam `PORT=0` e recebem a porta efetiva via IPC somente após `listen`. Green local: parsing 1/1 e H01 + PostgreSQL/HTTP 32/32, zero skips. Revisão Luna/medium aprovada; o caminho IPC é exercitado pelos testes HTTP, não pelo teste unitário do parser. Não houve red unitário observado para este microproblema.
- **B2-CI-CLEANUP:** red no Biome: variável `bridge` fora de escopo no timeout. Objeto mantido durante toda a inicialização; erro/timeout limpa filho e spool próprios, guardas distinguem saída por sinal. Green: sintaxe e lint focal aprovado; revisão independente Luna/low aprovada. Não houve nova execução integral PostgreSQL neste microcommit.
- **Checkpoint remoto verde:** [CI 33087107265](https://github.com/millennium42/camoburguer-demo/actions/runs/33087107265), SHA `f0f0633200048e70e8d3db2625d123c3c42d03b3`: unitários, audit, migrations UP/DOWN, PostgreSQL/HTTP, Docker, seed explícito, smoke, E2E e simulador aprovados. Não cobre commits posteriores.
- **B2.3-TZ:** executor observou red (sessão/data SQL em UTC e runtime permitindo divergência). Green reproduzido pelo principal: 23/23 timezone + financeiro, zero skips; opções/SSL/credenciais preservados, `statement_timeout=2000`, datas SQL em torno de 03:00Z iguais ao calendário de São Paulo. Pools da API/CLI usam o mesmo helper de DSN; config recusa outro fuso. Testes não chamam init e usam banco próprio. Container `node:24-alpine` com `TZ=America/Sao_Paulo` também passou sem pacote adicional. Revisão Terra/high aprovada por leitura independente.
- **Continuidade após interrupção da conversa:** `resume_agent` recuperou Feynman como `interrupted`; continuação enfileirada no mesmo ID, sem recriar trabalho nem interromper agente por iniciativa do principal. Render segue `UNAUTHORIZED`/reautenticação necessária.

## Fechamento obrigatório

Registrar por microtarefa: red/green, revisão, commit e limitações. Ao concluir, adicionar SHA publicado, URL/conclusão de CI **desse SHA**, comandos reproduzíveis, rollback seguro e handoff. Não marcar o Bloco 2 concluído enquanto faltar evidência de requisito, mesmo com testes locais verdes.
