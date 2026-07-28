# Prompt 04 — Exigir turno na conclusão de pedido avulso

> Use em tarefa isolada. Não implemente outros achados.

## Missão

Corrija o **P1** que permite lançamento de venda com `shiftId=null`. A spec deve definir uma regra única e explícita por forma de pagamento e tipo de pedido; no mínimo, dinheiro exige turno aberto. Busca do turno, validação, transição e lançamento devem ser atômicos.

Incluído: conclusão de pedido avulso, formas de pagamento, vínculo ao turno, esperado de caixa, concorrência, testes e docs.
Fora: redesign de caixa, fiscal/CMV e achado 7.

Requisitos mínimos:

- venda sujeita a turno nunca persiste com `shiftId=null`;
- ausência de turno retorna `409`, sem efeitos parciais;
- fechamento concorrente do turno não cria lançamento órfão;
- regra de PIX/cartão e comandas é decidida na spec e aplicada coerentemente;
- migração/diagnóstico de lançamentos legados nulos e rollback são documentados.

## Orquestração obrigatória

1. Leia `AGENTS.md`, arquitetura, ciclos do pedido/financeiro, pagamentos, contexto operacional, auditoria e workflow. Use WSL, `rtk`, `m1nd` primeiro e Graphify para blast radius.
2. Subagente investigador somente leitura mapeia rotas, transações e testes. Subagente de domínio/banco define casos de corrida e reconciliação, também sem editar.
3. Execute **`/spec exigir-turno-na-conclusao`**; crie somente `specs/exigir-turno-na-conclusao.md`, com IDs `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem para qualquer decisão de negócio material.
4. Defina a rubrica antes da build. Um único escritor executa **`/build exigir-turno-na-conclusao`** sem alterar a spec ou refatorar fora dela.
5. Reviewer independente executa **`/review exigir-turno-na-conclusao`**, sem editar e por evidência própria. Repita até `APROVADA`; depois revisão final linha a linha P0/P1/P2. Qualquer `NÃO VERIFICADO`, P0 ou P1 bloqueia.

## Testes e definição de concluído

- Dinheiro sem turno: snapshots antes/depois provam ausência exata de nova transição do pedido, lançamento financeiro, movimento de estoque, ticket, SSE ou outro efeito derivado.
- Dinheiro com turno: lançamento contém `shiftId` e integra o esperado do caixa.
- PIX/cartão/comanda seguem exatamente a matriz definida.
- Corrida conclusão × fechamento de turno não cria estado inválido.
- Replays e falhas intermediárias são idempotentes/atômicos.
- Testes verificam valores e persistência reais, não apenas status HTTP.

## Ferramentas, referências visuais e gates

Inventarie antes de instalar; somente fonte oficial, versão fixada, mínimo privilégio e sem dependência runtime desnecessária. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados de `vercel-labs/agent-skills`; prove no código, banco e runtime.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uma consulta/invocação local. Fallback só após bloqueio documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Considere Three.js, GSAP, Anime.js, Motion, ReactBits, 21st.dev, shadcn e getdesign.md e registre **não aplicável**, exceto mensagem operacional mínima já coberta pela stack. Não redesenhe a UI.

Execute testes focados/transacionais/concorrentes, `npm run check`, `npm test`, smoke seguro, auditoria, `git diff --check` e Compose isolado. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Faça commits granulares apenas deste achado e push uma vez no final, só com review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve alterações alheias, não force e confirme `HEAD`/remoto/worktree e política da branch.

## Autoavaliação

Rubrica prévia: rastreabilidade 25; correção/invariantes 25; testes/regressões 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Após aprovação, avalie, liste perdas, melhore apenas dentro da spec e repita review se necessário. Reescreva o relatório até 100 ou ganho menor que 2, apresentando trajetória, matriz dos IDs, provas, commits, push, rollback e limites.
