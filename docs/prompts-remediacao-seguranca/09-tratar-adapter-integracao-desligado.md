# Prompt 09 — Tratar adapter de integração desligado

> Use isoladamente para este **P1**. Verifique no checkout as fronteiras mínimas do prompt 08: rota manual rejeita origens externas, UI usa mapping real e rota genérica bloqueia pedido integrado. Se faltarem, bloqueie esta execução e reporte a dependência; não amplie este prompt para implementar o 08.

## Missão

Evite “pedido aceito” falso e mappings presos em `accept_pending` quando adapters estão desligados. A spec deve escolher explicitamente:

- modo real: retornar `503`, sem transição/pendência enganosa; ou
- modo de simulação explícito, auditável, restrito à demo e com transição local definida.

Nunca responda sucesso por mero enqueue, ative simulação automaticamente ou habilite adapter sem credenciais.

Incluído: criação de comando, configuração dos adapters, seed/demo, transição simulada opcional, UI e testes.
Fora: implementação completa de parceiros e outbox do prompt 10.

## Fluxo com subagentes

1. Leia `AGENTS.md`, canais, arquitetura, ciclo do pedido, contexto operacional, docs de deploy/auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify.
2. Subagente investigador somente leitura prova o comportamento adapter off e estados existentes. Outro desenha testes de timeout/restart e separação demo/produção.
3. Execute **`/spec tratar-adapter-integracao-desligado`**, criando apenas `specs/tratar-adapter-integracao-desligado.md` com `REQ/CON/EDGE/DONE`. Pergunte uma decisão por mensagem; não escolha `503` versus simulação pelo usuário.
4. Defina rubrica. Um escritor executa **`/build tratar-adapter-integracao-desligado`**.
5. Reviewer independente executa **`/review tratar-adapter-integracao-desligado`**, sem editar. Repita até `APROVADA`; revisão final linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Real + adapter off: `503`, nenhum comando/mapping novo preso e UI mostra falha real.
- Demo simulada, se escolhida: transição local completa, idempotente e marcada como simulada.
- Seed é compatível com o modo e não cria operação impossível.
- Restart não inventa consumidor nem muda silenciosamente o modo.
- Timeout prova que nenhum mapping novo fica indefinidamente pendente.
- Simulação não pode ser ativada em produção; configuração falha fechada.
- Comandos antigos pendentes têm diagnóstico/migração segura.

## Ferramentas e frontend

Inventarie e instale apenas o necessário, oficial, fixado e mínimo. Use `codebase-memory-mcp` quando disponível/vinculado e skills auditados do `vercel-labs/agent-skills`.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, com versão/commit fixado, inspeção de scripts/permissões e prova de uso local. Fallback só após bloqueio documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md para banner/estado explícito de “simulação” ou indisponibilidade. Motion/GSAP/Anime.js apenas se discreto e acessível; Three.js é não aplicável. Não migre stack nem faça redesign. Registre licença, bundle e acessibilidade.

## Gates, Git e relatório

Execute testes de configuração, timeout, restart, UI e integração, `npm run check`, `npm test`, smoke nos dois modos, auditoria, `git diff --check` e Compose isolado. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Commits granulares exclusivos; push uma vez ao final, somente após review aprovada, gates verdes e P0=0/P1=0/P2=0. Sem segredos/force-push; confirme refs e branch.

Rubrica 25/25/20/15/10/5: rastreabilidade, invariantes, testes, segurança/migração, simplicidade, evidências. Após aprovação, pontue, corrija dentro da spec, re-review e reescreva relatório até 100 ou ganho menor que 2. Apresente trajetória, modo escolhido, IDs, provas, commits, push e limites.
