# Prompt 16 — Dead-letter e retries seguros na impressão

> Use isoladamente para este **P2**. Preserve o contrato canônico `domínio → print_jobs → API → print-bridge → spool`.

Antes de construir, verifique no checkout que reprocessamento manual pode ser protegido por autenticação/RBAC e que existe uma política explícita para PII no spool. Se qualquer dependência faltar, bloqueie e reporte; não implemente autenticação ou anonimização neste escopo.

## Missão

Impeça retries infinitos e estados inválidos:

- validar limite de 64 KiB antes de persistir/enviar, pela serialização exata;
- allowlist de status do bridge;
- classificar falha transitória/permanente;
- backoff exponencial com jitter, tentativas máximas e `next_attempt_at`;
- estado `dead_letter` com motivo/histórico;
- reprocessamento manual autenticado, autorizado e auditado;
- idempotência persistente no bridge/consumidor e reconciliação do caso “imprimiu, mas o ACK foi perdido”, sem prometer exatamente uma impressão física quando o hardware não oferecer prova/deduplicação.

Não trunque ticket silenciosamente, aceite status arbitrário ou resete todo `failed` para `pending`.

## Fluxo obrigatório

1. Leia `AGENTS.md`, arquitetura, padrão do ticket, contexto operacional, auditoria e workflow. Se o contrato textual mudar, atualize `docs/padrao-ticket-cozinha.md` antes do código. Use WSL + `rtk`, `m1nd` primeiro e Graphify.
2. Subagente investigador somente leitura mapeia estados, bridge, spool e tamanho. Outro especialista de impressão/testes projeta bytes, falhas, concorrência e duplicação física.
3. Execute **`/spec fila-impressao-dead-letter`**, criando só `specs/fila-impressao-dead-letter.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem para limite, retry/reprocessamento ou contrato materialmente ambíguos.
4. Defina rubrica. Um único escritor executa **`/build fila-impressao-dead-letter`**.
5. Reviewer independente executa **`/review fila-impressao-dead-letter`**, sem editar. Repita até `APROVADA`; revisão final linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Ticket acima do limite não entra em loop e não é truncado silenciosamente.
- Falha transitória recupera dentro do limite; permanente termina em `dead_letter`.
- Status desconhecido do bridge vira erro controlado e recuperável.
- Dois workers não imprimem o mesmo job.
- Perda de ACK depois da impressão é reconciliada por identificador persistente; retry cego não duplica e qualquer limite físico não demonstrável é declarado.
- Reprocessamento manual exige RBAC, é auditado e preserva payload/idempotência.
- Cálculo mede bytes realmente enviados, inclusive Unicode.
- Jobs históricos, migração/rollback e crescimento da dead-letter são tratados.
- PII no spool respeita a política do prompt 13.

## Ferramentas e frontend

Instale apenas o necessário, oficial, fixado e mínimo. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados do `vercel-labs/agent-skills`.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso local. Fallback só após bloqueio documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md se houver tela de dead-letter/reprocessamento. Motion/GSAP/Anime.js apenas para feedback acessível; Three.js é não aplicável. Não redesenhe o painel nem instale tudo.

## Gates e publicação

Execute testes de bridge/tamanho/backoff/concorrência com spool temporário, `npm run check`, `npm test`, smoke, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Impressora física só pode ser declarada validada se realmente testada; produção somente leitura.

Commits granulares exclusivos; push único ao final com review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve alterações, não force e verifique refs/branch.

Rubrica: rastreabilidade 25; invariantes 25; testes 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Autoavalie e itere dentro da spec até 100 ou ganho menor que 2, re-review após código. Relate trajetória, máquina de estados/IDs, provas, commits, push e limites físicos.
