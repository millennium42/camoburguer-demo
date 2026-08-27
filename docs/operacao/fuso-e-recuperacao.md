# Fuso e recuperação

## Calendário operacional

O calendário é `America/Sao_Paulo`, nunca um offset fixo. API, bridge e simulador
têm `TZ` na imagem e no Compose; PostgreSQL local inicia com esse fuso. Serviços
Node do Render recebem `TZ` pelo Blueprint. O runtime recusa outro
`BUSINESS_TIME_ZONE`.

O helper `apps/api/src/postgres.js` acrescenta o fuso como última opção do DSN,
preservando SSL, credenciais e outras opções. API e CLI de migrations usam o
mesmo helper antes da primeira conexão. O DSN bruto do ambiente não é reescrito
nem impresso. Sessões externas de administração devem conferir `SHOW TimeZone`
e usar `SET TIME ZONE 'America/Sao_Paulo'` quando necessário.

Teste: `rtk npm run test:timezone`, com `TEST_MIGRATIONS_DATABASE_URL` apontando
para o controle efêmero documentado em [migracoes.md](migracoes.md) e
`TEST_COMPOSE_CONFIG=true`. O teste compara SQL com o calendário financeiro
imediatamente antes/depois de 03:00Z e preserva `statement_timeout=2000`.

## PITR gerenciado — gate externo ainda aberto

O Blueprint mantém os planos Free existentes. Segundo a
[documentação oficial do Render](https://render.com/docs/postgresql-backups),
Free não oferece PITR; planos pagos têm backup contínuo e janela de recuperação
conforme o plano do workspace. Não houve alteração de plano ou cobrança.

Para fechar o gate: reconectar o Render, identificar a instância correta,
aprovar o custo se necessário, confirmar PITR ativo/janela recuperável e ensaiar
restauração em **nova instância**, conferindo ledger, hashes e valores financeiros.
Registrar instância, instante solicitado, resultado e evidência sem credenciais.
Não sobrescrever a origem nem desligar o serviço operacional durante o ensaio.

Um `pg_dump`/`pg_restore` isolado prova restauração lógica, não PITR. Backups
contêm dados pessoais: restringir acesso, aplicar retenção do provedor e executar
a política de anonimização após restauração, antes de expor a instância recuperada.

## Ensaio lógico reproduzível

Execute `rtk npm run test:recovery` com `TEST_MIGRATIONS_DATABASE_URL` do controle
efêmero e `TEST_POSTGRES_CONTAINER` identificando o container PostgreSQL 16.14
de teste. Aceitam-se somente o label `camoburguer.scope=bloco2-test` ou o projeto
Compose `camoburguer-auto-seed-test` do CI. Não use um container operacional.

A suíte cria dois bancos aleatórios próprios, semeia dados sintéticos na origem,
mantém o dump custom apenas em memória e restaura em destino vazio com transação
única. Não usa `--clean` nem sobrescreve um banco existente. Compara ledger,
hashes, vínculos e valores financeiros dos dois bancos e confirma origem intacta.
O cleanup remove apenas as duas fixtures criadas. Sem as duas variáveis, o teste
real é explicitamente pulado; não confundir isso com prova de restauração.
No gate obrigatório, `REQUIRE_RECOVERY_TESTS=true` transforma ausência de identidade
em falha. Os clientes rodam com ambiente limpo e host/porta explícitos; antes do
dump/restore, o identificador do cluster e os nomes dos dois bancos são comparados
entre os pools e o cliente dentro do container. O teste injeta `PGSERVICE` e
`PGHOSTADDR` conflitantes e comprova que não redirecionam a operação.
