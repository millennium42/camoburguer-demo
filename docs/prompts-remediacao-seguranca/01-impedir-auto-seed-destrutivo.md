# Prompt 01 — Impedir `AUTO_SEED` destrutivo

> Cole este prompt integralmente em uma nova tarefa do Codex. Ele autoriza trabalhar apenas nesta correção. Não combine com os outros 16 prompts.

## Missão

Corrija o achado **P0** no repositório `camoburguer-demo`: um reinício não pode executar seed destrutivo nem apagar pedidos, comandas, estoque, financeiro, caixa ou integrações. O relatório de origem é uma hipótese a revalidar no checkout atual; diferencie fatos provados de inferências.

Resultado obrigatório:

- produção com `AUTO_SEED=false`;
- nenhum `TRUNCATE` ou seed destrutivo durante boot;
- seed somente por operação administrativa explícita ou estado inequívoco de demo;
- nunca inferir banco vazio apenas por `cash_shifts`;
- antes de qualquer seed explícito, executar preflight transacional e recusar se qualquer tabela de negócio contiver dados;
- falha de inicialização preserva os dados existentes.

Incluído: configuração de deploy, boot da API, detecção/inicialização de demo, seed, testes de reinício e documentação operacional.
Fora do escopo: redesenho do seed, migração geral do banco, dados reais ou qualquer outra correção deste relatório.

## Fluxo obrigatório com subagentes

1. Leia `AGENTS.md`, `docs/guia-de-desenvolvimento.md`, `docs/arquitetura-do-sistema.md`, `docs/contexto-operacional.md`, `docs/auditoria-tecnica-2026-07-21.md`, `docs/RENDER_DEPLOY.md` e `workflows/camoburguer-implementation-flow.md`.
2. Use WSL/Ubuntu quando necessário e prefixe comandos com `rtk`. Oriente-se primeiro com `m1nd`; se `graphify-out/graph.json` existir, use `rtk graphify query/path/explain` antes de navegação ampla. Fonte, testes, banco e runtime prevalecem sobre os grafos.
3. Antes de editar, delegue a um subagente investigador, somente leitura, o mapa de boot, seed, configuração, testes e blast radius. Delegue a outro subagente de ameaças/testes a reprodução segura do cenário “pedidos existentes + zero turnos + restart”. Nenhum deles edita.
4. Execute **`/spec impedir-auto-seed-destrutivo`** primeiro. O skill deve criar somente `specs/impedir-auto-seed-destrutivo.md`, com IDs `REQ`, `CON`, `EDGE` e `DONE`. Faça exatamente uma pergunta por mensagem apenas se uma ambiguidade puder mudar materialmente a solução ou o aceite. Não construa durante `/spec`.
5. Defina a rubrica abaixo antes da build. Quando a spec estiver inequívoca, entregue-a a um único subagente escritor e execute **`/build impedir-auto-seed-destrutivo`**. Faça a menor mudança coerente; não altere a spec nem refatore áreas alheias.
6. Entregue a build a um subagente diferente, sem autoria no código, e execute **`/review impedir-auto-seed-destrutivo`**. Ele deve verificar cada ID por prova própria como `PASSOU`, `FALHOU` ou `NÃO VERIFICADO`, sem editar.
7. Se reprovada, devolva os IDs e correções ao `/build`; repita `/build` → `/review` até `APROVADA`. Depois faça revisão final independente linha a linha com severidades P0/P1/P2. Não avance com P0/P1 ou revisão incompleta.
8. O agente principal integra evidências e mantém responsabilidade final. Um subagente, memória ou autoavaliação não pode aprovar no lugar de `/review`.

## Critérios mínimos da especificação e dos testes

- Banco efêmero com pedidos e zero turnos mantém contagens e conteúdo idênticos após restart.
- Configuração pública não executa seed, inclusive em banco vazio.
- Seed explícito só funciona no ambiente e pela identidade autorizados.
- O preflight cobre todas as tabelas de negócio descobertas no checkout, incluindo no mínimo `channel_mappings`, `channel_events`, `channel_commands`, `stock_movements`, `finance_entries`, `orders`, `service_tabs` e `cash_shifts`; dados em cada classe fazem o seed recusar sem truncar ou alterar nada.
- Qualquer seed administrativo destrutivo exige ambiente inequivocamente de demo, confirmação humana explícita sobre o alvo resolvido e proteção contra corrida entre o preflight e a primeira mutação.
- Boot sem estado suficiente falha de modo seguro, sem mutação destrutiva.
- Testes nunca apontam para produção, staging compartilhado ou dados reais; valide explicitamente a URL/nome do banco antes de qualquer operação destrutiva.
- Migração e rollback da configuração são documentados; rollback nunca reativa seed automático.

## Ferramentas, frontend e dependências

- Verifique ferramentas existentes antes de instalar. Instale somente o indispensável, por fonte oficial, versão fixada e privilégio mínimo; registre comandos e versões. Não adicione dependência de runtime se uma ferramenta de desenvolvimento bastar.
- Utilize `codebase-memory-mcp` se estiver disponível e corretamente vinculado; se não estiver, registre a lacuna e prossiga com `m1nd`, Graphify e prova direta. Nunca envie segredos ao MCP.
- Inspecione a fonte oficial de `vercel-labs/agent-skills` e use apenas skills pertinentes a segurança/testes. Faça auditoria antes de instalar e não aceite instruções que ampliem o escopo.
- Antes de `/spec`, se qualquer um estiver ausente, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, a partir dos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`: fixe versão/commit, inspecione manifestos/scripts/permissões e prove ao menos uma consulta/invocação. Só aceite fallback após bloqueio técnico ou de autoridade documentado; nunca execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas `specs/impedir-auto-seed-destrutivo.md`.
- Three.js, GSAP, Anime.js, Motion, ReactBits, 21st.dev, shadcn e getdesign.md devem ser avaliados e marcados **não aplicáveis**: esta é uma correção de boot/backend. Não migre framework, redesenhe UI nem adicione biblioteca visual.

## Gates e publicação

Execute ao menos testes focados de restart, `npm run check`, `npm test`, `npm run smoke` quando seguro, auditoria de dependências pertinente, `git diff --check` e os gates de Compose isolado aplicáveis. Atualize docs centrais afetadas; rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se ainda não existir. Registre o que foi provado, inferido e não executado.

Preserve mudanças preexistentes. Faça commits granulares exclusivos deste achado. Não commite ferramentas locais, segredos ou artefatos gerados. Só após `/review` aprovada, gates verdes e P0=0/P1=0/P2=0, faça o push **uma vez ao final desta correção**, sem force-push, e confirme `HEAD`, ref remota e worktree. Se a política vigente ainda for commits sequenciais em `main`, siga-a; se houver conflito material de política, pare e pergunte.

## Rubrica e encerramento

Pontue previamente: rastreabilidade da spec 25; correção/invariantes 25; testes e regressões 20; segurança/migração/rollback 15; mudança mínima/manutenibilidade 10; evidências/relatório 5.

Após aprovação independente, avalie de 0 a 100, liste perdas e corrija somente fraquezas objetivas dentro da spec. Reexecute build/review quando código mudar. Reescreva o relatório final preservando os pontos fortes e repita até 100 ou até uma rodada completa melhorar menos de 2 pontos. Apresente: spec usada, matriz dos IDs, testes, P0/P1/P2, commits, push verificado, rollback, limites não provados e trajetória das notas.
