# Prompt 11 — Watchdog e correlação exata de comandos iFood

> Use isoladamente para este **P1**. Verifique no checkout se efeitos HTTP já ocorrem fora da transação, comandos têm ownership/lease seguro e resultados ambíguos passam por reconciliação. Se algum invariante faltar, bloqueie esta execução e reporte a dependência; não implemente o prompt 10 neste escopo.

## Missão

Garanta término observável dos comandos iFood em `awaiting_event`:

- deadline persistido;
- watchdog de expirados com reconciliação antes de retry/falha;
- correlação pelo comando exato, tipo, pedido e identificador externo;
- `CANCELLATION_REQUEST_FAILED` nunca altera comando de aceite;
- tentativas máximas, backoff, terminal/dead-letter e reprocessamento controlado;
- transições idempotentes e auditáveis.

Incluído: estados de comando iFood, eventos, watchdog, reconciliação, retries, testes e docs.
Fora: Delivery Much, redesign geral do poller e chamadas reais não homologadas.

## Orquestração

1. Leia `AGENTS.md`, arquitetura, canais, automações, ciclo do pedido, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify.
2. Subagente investigador somente leitura mapeia estados/predicados/eventos. Outro projeta relógio controlável, duplicidade, ordem invertida e eventos tardios.
3. Execute **`/spec watchdog-correlacao-ifood`**, criando apenas `specs/watchdog-correlacao-ifood.md` com `REQ/CON/EDGE/DONE`. Faça uma pergunta por mensagem para timeout, política de retry ou reconciliação materialmente indefinidos.
4. Defina rubrica. Um escritor executa **`/build watchdog-correlacao-ifood`**.
5. Reviewer independente executa **`/review watchdog-correlacao-ifood`**, sem editar. Repita até `APROVADA`; finalize com revisão linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Confirmação normal finaliza apenas o comando correto.
- Evento ausente aciona watchdog no prazo.
- Watchdog reconcilia antes de reenviar ou falhar.
- Evento tardio, duplicado ou fora de ordem não corrompe estado terminal.
- Falha de cancelamento não modifica aceite.
- Comando nunca permanece indefinidamente sem alerta/estado terminal.
- Dois watchdogs não processam o mesmo comando.
- Migração de `awaiting_event` legado e rollback são seguros.

## Ferramentas, frontend, gates e Git

Verifique antes de instalar; oficial, fixado, mínimo. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados do `vercel-labs/agent-skills`.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso local. Fallback só após bloqueio documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Referências visuais Three.js, GSAP, Anime.js, Motion, ReactBits, 21st.dev, shadcn e getdesign.md são não aplicáveis, salvo indicador operacional mínimo já na stack. Sem redesign.

Execute testes de relógio/eventos/concorrência somente com fakes ou sandbox isolado sem efeitos reais, `npm run check`, `npm test`, smoke seguro, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Não envie mutações a parceiro ou produção reais, mesmo que existam credenciais; produção permanece somente leitura.

Commits granulares exclusivos; push uma vez no fim após review aprovada, gates verdes e P0=0/P1=0/P2=0. Não force; preserve e verifique refs/branch.

Rubrica 25/25/20/15/10/5. Após aprovação, autoavalie, corrija dentro da spec, re-review e reescreva relatório até 100 ou ganho menor que 2. Mostre trajetória, estados/deadlines, IDs, provas, commits, push e limites.
