# Impedir auto-seed destrutivo

## Objetivo

Eliminar qualquer seed destrutivo durante a inicialização da API e permitir dados de demonstração somente por uma operação administrativa explícita, autenticada, inequivocamente limitada a um banco de demo e protegida por confirmação do alvo, preflight transacional e bloqueio contra concorrência.

Os usuários protegidos são operadores, mantenedores e integrações que dependem da preservação de pedidos, comandas, estoque, financeiro, caixa, impressão e estado de canais durante boot, restart, falha de inicialização e rollback.

## Escopo

### Incluído

- configuração do deploy e da API relacionada a `AUTO_SEED`;
- boot e restart da API;
- rota administrativa e execução explícita do seed de demo;
- resolução e confirmação do alvo de banco;
- preflight de todas as 14 tabelas de negócio do checkout, incluindo registros idempotentes;
- proteção transacional contra corrida entre preflight e primeira mutação;
- testes unitários, de contrato e PostgreSQL efêmero;
- documentação de operação, migração e rollback;
- atualização dos gates de CI/Compose estritamente necessária.

### Fora do escopo

- redesenhar o conteúdo comercial do seed;
- migrations versionadas ou migração geral do schema;
- alterar dados reais, staging compartilhado ou produção;
- autenticação geral das rotas operacionais;
- mudanças em frontend, ticket de cozinha, integrações de parceiros ou financeiro não exigidas por esta correção;
- instalar dependência de runtime ou biblioteca visual;
- Three.js, GSAP, Anime.js, Motion, ReactBits, 21st.dev, shadcn e getdesign.md.

## Estado e tabelas protegidas

As tabelas de negócio descobertas no checkout são:

1. `service_tabs`;
2. `catalog_items`;
3. `orders`;
4. `order_tab_assignments`;
5. `print_jobs`;
6. `stock_balances`;
7. `stock_movements`;
8. `cash_shifts`;
9. `tab_payments`;
10. `finance_entries`;
11. `channel_mappings`;
12. `channel_events`;
13. `channel_commands`.

Para o preflight:

- qualquer linha em `service_tabs`, `orders`, `order_tab_assignments`, `print_jobs`, `stock_movements`, `cash_shifts`, `tab_payments`, `finance_entries`, `channel_mappings`, `channel_events` ou `channel_commands` é estado operacional e bloqueia o seed;
- qualquer quantidade diferente de zero em `stock_balances` é estado operacional e bloqueia o seed;
- `catalog_items` é verificada, mas o snapshot canônico inserido por `db.init()` é baseline permitido porque o seed não o apaga nem o recria; SKU criado pelo operador, item arquivado ou qualquer divergência persistida em relação ao snapshot canônico é estado operacional e bloqueia o seed;
- os três registros canônicos de `stock_balances` com quantidade zero são baseline permitido.

## Fluxo administrativo esperado

1. A API sobe somente quando `AUTO_SEED` está ausente ou é exatamente `false`.
2. `AUTO_SEED=true` faz a inicialização falhar cedo com mensagem acionável, antes de chamar seed ou executar mutação destrutiva.
3. O seed é iniciado por operação administrativa explícita; a rota exige sessão `admin` e CSRF.
4. O ambiente precisa declarar modo demo e habilitação explícita de seed.
5. A configuração informa a identidade exata esperada do banco de demo sem credenciais.
6. A requisição informa uma confirmação humana exata do alvo resolvido.
7. Dentro de uma única transação, o sistema resolve o alvo real, bloqueia as tabelas em ordem fixa, executa o preflight e somente então inicia a primeira mutação.
8. Qualquer falha aborta a transação e preserva o estado anterior.

## Requisitos exatos

- REQ-001: O boot da API nunca deve chamar `runSeedDemo` nem executar `TRUNCATE`, `UPDATE` de reset ou inserção de dados de demonstração, independentemente de o banco estar vazio ou de `cash_shifts` conter zero linhas.
- REQ-002: `render.yaml`, `.env.example`, Compose e toda configuração pública versionada devem definir `AUTO_SEED=false` ou omitir a variável; nenhuma configuração versionada pode habilitar auto-seed.
- REQ-003: Se `AUTO_SEED=true` for fornecido em runtime, a API deve falhar cedo com erro acionável e código de saída diferente de zero, sem tentar inferir banco vazio e sem chamar o seed.
- REQ-004: O seed explícito deve exigir simultaneamente identidade administrativa válida, modo de ambiente inequivocamente `demo`, habilitação explícita de seed e alvo esperado configurado.
- REQ-005: A operação administrativa deve resolver no PostgreSQL a identidade real do alvo e compará-la ao alvo esperado sem incluir usuário ou senha; divergência deve recusar a operação antes de qualquer mutação.
- REQ-006: A operação administrativa deve exigir uma confirmação humana exata do alvo resolvido na própria requisição; confirmação ausente ou divergente deve recusar a operação antes de qualquer mutação.
- REQ-007: A execução direta de `scripts/seed-demo.mjs` não pode contornar autenticação, ambiente, alvo, confirmação ou preflight; deve recusar acesso direto ao banco ou aplicar exatamente os mesmos gates.
- REQ-008: O preflight deve cobrir todas as 14 tabelas de negócio descritas nesta especificação e retornar quais classes de estado impediram a operação, sem expor conteúdo sensível.
- REQ-009: Qualquer estado operacional definido nesta especificação deve fazer o seed recusar sem truncar, zerar, inserir, atualizar ou apagar qualquer dado.
- REQ-010: Resolução do alvo, bloqueio, preflight e seed devem ocorrer em uma única transação; todas as tabelas protegidas devem ser bloqueadas em ordem fixa com nível que impeça inserts, updates, deletes ou seeds concorrentes entre o preflight e a primeira mutação.
- REQ-011: Em baseline vazio permitido, uma única operação administrativa válida pode executar o conteúdo demonstrativo existente de forma atômica.
- REQ-012: Falha em qualquer query após a primeira mutação deve causar rollback integral, preservando contagens e conteúdo anteriores.
- REQ-013: Respostas HTTP devem distinguir autenticação ausente/inválida, ambiente não autorizado, confirmação/alvo inválidos, conflito de preflight e falha interna, sem devolver `500` para recusas esperadas.
- REQ-014: Logs devem registrar decisão, ator administrativo autenticado, alvo sanitizado e resultado do preflight, sem registrar token, senha, `DATABASE_URL` completa ou conteúdo das tabelas.
- REQ-015: O restart com pedidos existentes e zero turnos deve preservar contagens e conteúdo de todas as 14 tabelas, inclusive quando o processo recebe `AUTO_SEED=true`; nesse caso a inicialização pode falhar cedo, mas os dados devem permanecer idênticos.
- REQ-016: O boot com banco baseline vazio e configuração pública segura deve concluir sem criar dados demonstrativos.

## Restrições

- CON-001: A mudança deve ser a menor alteração coerente e não pode refatorar áreas alheias.
- CON-002: A especificação não pode ser alterada durante `/build` ou `/review`.
- CON-003: Nenhuma dependência de runtime nova pode ser adicionada se Node e PostgreSQL existentes forem suficientes.
- CON-004: Testes destrutivos só podem usar PostgreSQL efêmero, isolado e inequivocamente nomeado como teste; produção, staging compartilhado, Render e dados reais são proibidos.
- CON-005: Antes de qualquer operação destrutiva em teste, o harness deve validar URL, host, porta, nome do banco e identidade do contêiner/processo efêmero.
- CON-006: O alvo confirmado e logado não pode conter credenciais.
- CON-007: A proteção de corrida não pode depender somente de advisory lock cooperativo.
- CON-008: `cash_shifts` nunca pode ser usado isoladamente para inferir banco vazio.
- CON-009: O snapshot canônico de `catalog_items` e os três saldos zero são baseline de boot, não autorização implícita para seed.
- CON-010: Rollback de configuração ou código nunca pode reativar `AUTO_SEED`.
- CON-011: Alterações preexistentes e arquivos não rastreados do usuário devem ser preservados.
- CON-012: O trabalho deve permanecer no núcleo backend/boot; ferramentas e bibliotecas de frontend listadas como fora do escopo são não aplicáveis.
- CON-013: Fonte, schema, testes e runtime prevalecem sobre m1nd, Graphify e documentação histórica.
- CON-014: Commits devem ser granulares e exclusivos deste achado; push ocorre uma única vez após aprovação e gates verdes.

## Casos extremos e falhas

- EDGE-001: `orders` contém pedido sentinela e `cash_shifts` está vazia; restart não altera nenhuma tabela.
- EDGE-002: Banco baseline vazio, `AUTO_SEED=false`; boot não semeia.
- EDGE-003: Banco baseline vazio, `AUTO_SEED=true`; boot falha cedo e não semeia.
- EDGE-004: Cada uma das 11 tabelas com linhas operacionais é, isoladamente, suficiente para o preflight recusar.
- EDGE-005: `stock_balances` contém saldo não zero; preflight recusa sem zerar o estoque.
- EDGE-006: `catalog_items` contém item criado, arquivado ou divergente do snapshot; preflight recusa sem alterar catálogo.
- EDGE-007: Token correto com ambiente, alvo esperado ou confirmação inválidos; operação recusa sem mutação.
- EDGE-008: Duas tentativas válidas de seed concorrem; o bloqueio serializa o preflight e no máximo uma pode semear.
- EDGE-009: Erro injetado após a primeira mutação; rollback restaura integralmente o baseline anterior.
- EDGE-010: Seed explícito é solicitado enquanto uma escrita operacional concorre; a escrita não pode entrar entre preflight e primeira mutação.
- EDGE-011: `DATABASE_URL` é malformada, aponta para host/banco não autorizado ou não permite resolver a identidade; operação falha fechada.
- EDGE-012: Falha de `db.init()` ou de validação de configuração; nenhum fallback chama seed.

## Definição de concluído

- DONE-001: Teste focado prova que `AUTO_SEED=true` falha cedo sem invocar seed e que `AUTO_SEED=false`/ausente sobe sem seed em banco baseline vazio.
- DONE-002: Teste PostgreSQL efêmero cria pedido sentinela com zero `cash_shifts`, captura snapshot canônico das 14 tabelas, reinicia a API e prova igualdade integral após o restart.
- DONE-003: Teste parametrizado cobre as 14 tabelas e prova recusa sem alteração para cada classe de estado operacional.
- DONE-004: Testes provam autenticação, modo demo, habilitação, alvo esperado e confirmação humana, incluindo todos os caminhos de recusa.
- DONE-005: Testes concorrentes provam serialização entre preflight e mutação e que no máximo uma tentativa semeia.
- DONE-006: Teste com falha injetada após a primeira mutação prova rollback integral.
- DONE-007: `npm run check`, `npm test`, `npm run smoke` quando seguro, auditoria de dependências, `git diff --check` e gates Compose isolados aplicáveis passam.
- DONE-008: `README.md`, `docs/guia-de-desenvolvimento.md`, `docs/RENDER_DEPLOY.md`, `docs/5w2h-evolucao.md` e CI documentam operação explícita, migração e rollback sem auto-seed.
- DONE-009: Graphify é atualizado após código/docs, e a revisão independente marca todos os IDs como `PASSOU`.
- DONE-010: Revisão final linha a linha encerra com P0=0, P1=0 e P2=0 dentro desta especificação.
- DONE-011: O relatório final separa prova direta, inferência e não verificado; inclui commits, push, HEAD/ref remota/worktree, rollback e limites.

## Rubrica prévia

| Dimensão | Pontos |
| --- | ---: |
| Rastreabilidade da spec | 25 |
| Correção e invariantes | 25 |
| Testes e regressões | 20 |
| Segurança, migração e rollback | 15 |
| Mudança mínima e manutenibilidade | 10 |
| Evidências e relatório | 5 |
| **Total** | **100** |

A build só pode receber 100 quando todos os IDs tiverem evidência positiva, todos os gates aplicáveis estiverem verdes e não houver P0, P1 ou P2 aberto dentro do escopo.
