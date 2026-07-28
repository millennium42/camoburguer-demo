# Prompt 07 — Idempotência de rodadas e ajustes de caixa

> Use em tarefa exclusiva. Verifique no checkout os invariantes mínimos do prompt 06: fingerprint canônico persistido, replay idêntico sem novo efeito, divergência `409` e proteção concorrente. Se qualquer um faltar, bloqueie esta execução e reporte a dependência; não reimplemente o prompt 06 dentro deste escopo.

## Missão

Torne retries após perda de resposta seguros:

- a UI mantém a mesma chave enquanto o payload lógico da rodada não mudar;
- uma nova chave só surge após alteração material ou confirmação concluída;
- reforço e sangria exigem `Idempotency-Key`;
- fingerprint de ajuste cobre turno, tipo, valor e motivo;
- replay divergente retorna `409`;
- constraint e transação impedem efeito duplicado.

Incluído: ciclo de chave na UI, rodada, reforço/sangria, persistência, concorrência, efeitos e testes.
Fora: demais operações financeiras e redesign de caixa.

## Fluxo obrigatório

1. Leia `AGENTS.md`, arquitetura, ciclo financeiro/pedido, pagamentos, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify para UI → endpoints → ledger/estoque/ticket.
2. Um subagente somente leitura mapeia a vida da chave e efeitos. Outro projeta fault injection de resposta perdida, duplo clique e concorrência.
3. Execute **`/spec idempotencia-rodadas-ajustes-caixa`**, criando apenas `specs/idempotencia-rodadas-ajustes-caixa.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem se escopo/equivalência de chave forem ambíguos.
4. Defina a rubrica. Um único escritor executa **`/build idempotencia-rodadas-ajustes-caixa`**.
5. Reviewer independente executa **`/review idempotencia-rodadas-ajustes-caixa`**, sem editar. Repita até `APROVADA`, depois revisão linha a linha P0/P1/P2. Não avance com não verificado/P0/P1.

## Aceite

- Resposta perdida + retry gera uma rodada, uma baixa de estoque e um ticket.
- Duplo clique gera um efeito; payload alterado gera nova chave.
- Retry idêntico de reforço/sangria gera um lançamento.
- Mudança de turno, tipo, valor ou motivo com a mesma chave gera `409`.
- Chave ausente em ajuste sensível é rejeitada conforme contrato.
- Concorrência real é testada; falha intermediária não deixa efeitos parciais.
- Coordenação com turno aberto e registros legados está na spec.

## Ferramentas e UX

Verifique antes de instalar; fontes oficiais, versões fixadas, mínimo privilégio. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados do `vercel-labs/agent-skills`; não substituem teste.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, com versão/commit fixado, inspeção de scripts/permissões e prova de uso. Fallback só após bloqueio documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md para estados de envio, prevenção de duplo clique e feedback de retry. Motion/GSAP/Anime.js só se a stack precisar de transição mínima acessível; Three.js é não aplicável. Não instale todas nem faça redesign.

## Gates e publicação

Execute testes de fault injection/concorrência/UI, `npm run check`, `npm test`, smoke seguro, auditoria, `git diff --check` e Compose isolado. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Commits granulares exclusivos; push uma vez ao final depois de review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve mudanças alheias, não force e confirme refs/política de branch.

Rubrica 25/25/20/15/10/5 para rastreabilidade, correção, testes, segurança/migração, simplicidade e evidências. Após aprovação, pontue, corrija fraquezas dentro da spec, repita review se necessário e reescreva relatório até 100 ou ganho menor que 2. Mostre trajetória, IDs, provas, commits e push.
