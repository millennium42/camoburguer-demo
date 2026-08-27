# Retenção de clientes após entrega

Status deste snapshot: relógio, política JSON/guards, serviço, CLI e script
diário implementados. A execução automática no provedor continua opt-in.

## Contrato

- Elegíveis: pedidos concluídos há **mais de 30 dias**, pelo `completed_at`,
  incluindo cancelamento posterior à entrega. Cancelados sem entrega comprovada,
  pedidos recentes e operações abertas não ganham uma data de entrega inventada.
- Seleção por ID/data, nunca busca global por nome. Mesmo cliente pode ter um
  pedido antigo elegível e outro recente que deve permanecer intacto.
- Uma comanda só perde identificação quando está fechada e todas as suas rodadas
  são elegíveis. IDs, vínculos, hashes de autenticação/idempotência, saldos,
  parcelas, valores e métodos financeiros devem permanecer iguais.
- A política `retention_redact_json` é única no PostgreSQL. Remove dados de
  contato/endereço/coordenadas e texto livre; preserva IDs transacionais
  explícitos, hashes, recibos, enums, SKUs, nomes de produtos e valores numéricos
  (inclusive strings monetárias decimais). Campos como `emailId` não são IDs
  transacionais. Não é uma classificação universal de qualquer JSON arbitrário.
- Guards impedem writes posteriores com dados pessoais em pedidos já marcados e
  seus tickets. O guard de impressão usa `FOR SHARE`, inclusive contra updates
  não-chave. O formato normal do ticket permanece inalterado.

## Job diário implementado

O CLI tem dry-run como padrão em transação `REPEATABLE READ READ ONLY`, sem
`init`/migrations, seed ou chamadas que alterem spool. Mostra apenas contagens,
nunca nomes, contatos ou DSN. Apply exige `--apply` e
`--confirm-database=NAME`, conferindo `current_database()` no servidor conectado.

Uma transação deve revisar pedidos antigos e artefatos ligados (comandas,
financeiro, integrações, auditoria e impressão), preservando operações recentes.
Revisitar artefatos antigos mesmo depois da primeira anonimização evita manter
novos payloads pessoais que cheguem atrasados. Repetição sem mudança é no-op.
Pedidos/prints ocupados ou em envio devem ser adiados com resultado explícito;
não declarar sucesso completo nem disputar locks em ordem inversa com o worker.

Registrar resultado em `privacy_requests` com política/chave próprias. A limpeza
autenticada do spool ocorre depois do commit, em lotes de até 100 artefatos;
falha deixa `pending_external_cleanup`, recuperável na próxima execução.
Interrupção após o commit não perde essa fila. Pedidos/prints ocupados são
adiados com `SKIP LOCKED`.
Não alterar a operação administrativa manual `/lgpd/anonymize` nem os backups.

O script executável `scripts/retention-daily.sh` agenda uma execução por dia;
o template Render está em [retencao-cron.md](retencao-cron.md), mas templates
não equivalem a ativação no provedor. Aprovação de plano/custo continua
obrigatória para recursos pagos.
Após restaurar um backup, reaplicar a política antes de expor os dados recuperados.
