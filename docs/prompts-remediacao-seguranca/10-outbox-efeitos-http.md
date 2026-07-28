# Prompt 10 — Outbox para efeitos HTTP externos

> Use em tarefa isolada para este **P1**. Não reescreva integrações além do necessário.

## Missão

Remova chamadas HTTP externas de dentro de transações PostgreSQL e torne o ciclo de comandos resiliente:

1. transação curta reivindica o comando de forma atômica;
2. commit;
3. chamada externa;
4. nova transação finaliza;
5. resultado ambíguo passa por consulta/reconciliação, nunca reenvio cego.

Defina estados, lease/lock expirável, concorrência de workers, tentativas, correlação e telemetria. Use identificador idempotente estável perante o parceiro quando suportado.

Incluído: poller, adapters, outbox/comandos, migração, retries, reconciliação, observabilidade e testes.
Fora: troca de fornecedor, reescrita integral dos adapters e features de integração.

## Fluxo obrigatório

1. Leia `AGENTS.md`, arquitetura, canais, ciclo do pedido, automações, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify para transação → adapter → comando → pedido.
2. Subagente investigador somente leitura localiza toda rede dentro de transação e estados existentes. Outro subagente de banco/sistemas distribuídos projeta crash points, lease, concorrência e reconciliação, sem editar.
3. Execute **`/spec outbox-efeitos-http`**, criando somente `specs/outbox-efeitos-http.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem se garantias do parceiro, lease ou ambiguidade de resultado mudarem o design.
4. Defina a rubrica. Um único escritor executa **`/build outbox-efeitos-http`**, preservando contratos e fazendo a menor mudança segura.
5. Reviewer independente executa **`/review outbox-efeitos-http`**, sem editar. Repita até `APROVADA`; depois revisão linha a linha P0/P1/P2. `NÃO VERIFICADO`, P0 ou P1 bloqueia.

## Aceite obrigatório

- Teste afirma que nenhuma chamada HTTP ocorre com transação aberta.
- Parceiro aceita e persistência final falha: nova execução reconcilia sem duplicar.
- Crash antes/depois de cada fronteira tem resultado definido e testado.
- Dois pollers não processam o mesmo comando simultaneamente.
- Lease vencido é recuperável; worker vivo não perde ownership silenciosamente.
- Retry transitório respeita backoff/limite; resultado ambíguo não é reenviado cegamente.
- Tentativas, respostas, erros, timestamps e correlação são auditáveis sem segredos/PII indevida.
- Migração de pendentes e rollback evitam processamento duplo durante rollout.

## Ferramentas, frontend e gates

Instale só o indispensável por fonte oficial, versão fixada e mínimo privilégio. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados do `vercel-labs/agent-skills`; banco/runtime são fonte de verdade.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uma consulta/invocação local. Fallback só após bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Three.js, GSAP, Anime.js, Motion, ReactBits, 21st.dev, shadcn e getdesign.md são não aplicáveis. Não faça UI ou adicione dependência visual.

Execute testes com fault injection/concorrência, `npm run check`, `npm test`, smoke isolado com adapters falsos, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Não envie comandos reais a parceiros nem escreva em produção.

Commits granulares só deste achado; push uma vez ao final com review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve mudanças alheias, não force e confirme refs/política da branch.

## Rubrica e entrega

Rastreabilidade 25; correção/invariantes 25; testes 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Após aprovação, pontue, corrija fraquezas dentro da spec, re-review e reescreva relatório até 100 ou ganho menor que 2. Entregue diagrama de estados, matriz de crash points/IDs, provas, migração/rollback, commits, push e trajetória.
