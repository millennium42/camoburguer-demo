# Prompt 15 — Emitir SSE após fechamento de comanda

> Use isoladamente para este **P2**. Verifique no checkout que SSE exige autenticação/autorização antes de emitir dados e que reconnect não permite bypass. Se faltar, bloqueie esta execução e reporte a dependência; não implemente o prompt 02 neste escopo.

## Missão

Faça todos os terminais convergirem após fechar uma comanda. A spec deve escolher e documentar um contrato:

- `tab.closed`;
- eventos resumidos de conclusão das rodadas; ou
- `orders.refresh.required`.

O evento só pode ser publicado depois de commit bem-sucedido, com correlação suficiente e sem PII desnecessária. Consumidores são idempotentes; rollback não publica estado inexistente.

Incluído: fechamento de comanda/rodadas, contrato SSE, publicação pós-commit, consumidores, reconnect/refetch, testes e docs.
Fora: nova infraestrutura de mensageria e redesign geral do painel.

## Orquestração

1. Leia `AGENTS.md`, arquitetura, ciclos do pedido/financeiro, pagamentos, contrato SSE, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify.
2. Subagente investigador somente leitura mapeia transação/publicação/consumidores. Outro especialista de testes modela dois clientes, rollback, duplicidade, reconnect e tempestade de refresh.
3. Execute **`/spec sse-fechamento-comanda`**, criando apenas `specs/sse-fechamento-comanda.md` com `REQ/CON/EDGE/DONE`. Faça uma pergunta por mensagem para escolher contrato se isso estiver materialmente aberto.
4. Defina rubrica. Um escritor executa **`/build sse-fechamento-comanda`**.
5. Reviewer independente executa **`/review sse-fechamento-comanda`**, sem editar. Repita até `APROVADA`; revisão final linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Dois clientes conectados: o segundo converge sem ação manual.
- Commit falho/rollback não publica evento.
- Evento duplicado não gera estado inconsistente.
- Reconnect ou perda do evento converge por refetch/estratégia definida.
- Rodadas, caixa e financeiro exibem estado confirmado.
- SSE exige autenticação e autorização apropriadas.
- Payload não expõe PII desnecessária e evita tempestade de refresh.
- Contrato tem versão/compatibilidade e rollback documentados.

## Ferramentas e frontend

Instale só ferramentas oficiais indispensáveis, fixadas e mínimas. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados de `vercel-labs/agent-skills`.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso local. Fallback só após bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md para atualização de estado não disruptiva. Use Motion/GSAP/Anime.js apenas para transição sutil, acessível e com `prefers-reduced-motion`; Three.js é não aplicável. Não instale todas, não migre stack e não masque atraso de dados com animação.

## Gates, Git e relatório

Execute testes reais de SSE/múltiplos clientes/reconnect em ambiente isolado, `npm run check`, `npm test`, smoke autenticado, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Commits granulares exclusivos; push uma vez no final após review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve mudanças, não force e verifique refs/branch.

Rubrica 25/25/20/15/10/5. Após aprovação, pontue, corrija dentro da spec, re-review e reescreva relatório até 100 ou ganho menor que 2. Entregue trajetória, contrato/payload, matriz de clientes/IDs, provas, commits, push e limites.
