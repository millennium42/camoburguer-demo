# M-03: Garantir cardinalidade consistente entre pedido e channel mapping

## Objetivo e Problema
O banco garante unicidade do identificador externo (`UNIQUE (channel, merchant_id, external_id)`), mas não de `order_id` na tabela `channel_mappings`. Consultas do sistema pressupõem um único mapping por pedido, e a falta de restrição no banco de dados pode causar duplicação de pedidos em queries baseadas em JOIN ou seleção não determinística caso existam múltiplos registros para um mesmo pedido. O objetivo é restaurar o contrato arquitetural onde 1 pedido pertence a no máximo 1 canal externo.

## Escopo
### Incluído
- Formalizar a cardinalidade adicionando a restrição `UNIQUE (order_id)` na tabela `channel_mappings`.
- Detectar duplicatas preexistentes durante a migração/inicialização e falhar com diagnóstico antes de aplicar a constraint, sem apagar registros silenciosamente.
- Tornar a ingestão concorrente imune a conflitos de unicidade em `order_id` na `insertChannelMapping`, permitindo retorno de replay (idempotência).
- Simplificar/ajustar queries que não precisam assumir risco de duplicidade de pedido.
- Adicionar instrução administrativa no arquivo de especificação e via log/erro para reconciliar as duplicadas legadas.

### Fora do Escopo
- Suportar múltiplos canais por pedido (mudança arquitetural requerida e explicitamente excluída).

## Requisitos Exatos
- REQ-001: A tabela `channel_mappings` deve possuir a restrição `UNIQUE (order_id)`.
- REQ-002: Antes de aplicar a restrição na migração (ou no schema), deve-se detectar mapeamentos múltiplos para um mesmo `order_id` e interromper lançando exceção com os IDs.
- REQ-003: Durante ingestões simultâneas (concorrentes), caso haja colisão do mesmo pedido no `channel_mappings`, a exceção de restrição única do postgres (23505) deve ser tratada e a operação deve se comportar como tentativa repetida (retornando o mapping já existente ou lidando graciosamente para não crashar a fila, como replay de sucesso se o mapping externo bater).

## Restrições
- CON-001: O sistema não pode depender apenas da camada de aplicação; a restrição estrutural (PostgreSQL) deve garantir o bloqueio real na base.
- CON-002: Não se deve modificar os testes existentes para flexibilizar contratos de segurança, integridade ou cobertura.

## Casos Extremos e Falhas
- EDGE-001: Uma ingestão falha de outro módulo em paralelo tenta mapear para o mesmo `order_id` recém criado: a segunda ingestão causará conflito de unicidade de `order_id`, que deverá falhar previsivelmente e não corromper o banco.

## Estratégia de Migração e Compatibilidade
Na rotina de inicialização do schema (`db.js`), validaremos por duplicatas antes de criar a tabela/constraints se for possível, ou usaremos a rotina preflight. Se a duplicata legada existir (por ex, num banco preexistente não efêmero), a aplicação impedirá o boot até que o operador remova uma das linhas através de acesso administrativo, não descartaremos silenciosamente, reportando via script de migração.
Administração/Resolução: O operador deverá rodar `SELECT order_id, COUNT(*) FROM channel_mappings GROUP BY order_id HAVING COUNT(*) > 1;` e excluir a linha sobressalente.

## Arquivos Afetados
- `apps/api/src/db.js`
- `apps/api/src/integrations/integration-repository.js`
- `apps/api/src/integrations/order-ingestion.js` (se necessário)
- `tests/...`

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

## Definição de Concluído
- DONE-001: Restrição `UNIQUE (order_id)` ativa no banco.
- DONE-002: Teste de integração de inserção concorrente e duplicada lida sem crash indevido.
- DONE-003: Passar bateria de testes existente e não possuir duplicatas via JOIN na listagem.
