# Prompt 06 — Fingerprint para replay idempotente divergente

> Use isoladamente para este achado **P1**.

## Missão

Implemente, após revalidação, a distinção entre replay legítimo e reutilização conflitante de `Idempotency-Key` em pedidos, rodadas e cancelamentos.

Contrato mínimo:

- fingerprint SHA-256 de payload canônico;
- fingerprint persistido com a chave, o tipo da operação e a identidade canônica do pedido/comanda/recurso;
- mesmo conteúdo devolve o resultado original sem novos efeitos;
- conteúdo semanticamente divergente retorna `409`;
- canonicalização determinística cobre todo campo semanticamente relevante de cada operação, incluindo quando aplicável origem, cliente, endereço, forma de pagamento, dinheiro, itens, quantidades, desconto, motivo, opcionais e identidade do recurso; exclua apenas campos comprovadamente não semânticos;
- concorrência é protegida por constraint/transação, não só consulta prévia.

Não use hash do JSON bruto, não armazene segredos desnecessários e não aceite payload divergente com `200`.

## Execução com subagentes e skills

1. Leia `AGENTS.md`, arquitetura, ciclos, pagamentos, integrações, auditoria e workflow. Use WSL + `rtk`; `m1nd` primeiro e Graphify para todos os caminhos de idempotência e efeitos derivados.
2. Subagente investigador somente leitura compara pedidos/rodadas/cancelamentos com o contrato já usado em pagamentos. Subagente de banco/testes desenha canonicalização, migração e concorrência sem editar.
3. Execute **`/spec fingerprint-idempotencia-divergente`**, criando só `specs/fingerprint-idempotencia-divergente.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem para qualquer equivalência semântica material.
4. Defina a rubrica e execute **`/build fingerprint-idempotencia-divergente`** com um único escritor, sem mudar a spec nem ampliar o produto.
5. Reviewer independente executa **`/review fingerprint-idempotencia-divergente`**, sem editar. Repita até `APROVADA`, seguida de revisão final linha a linha P0/P1/P2. Item não verificado reprova.

## Matriz mínima de testes

- Replay idêntico para pedido, rodada e cancelamento.
- Divergência isolada de item, quantidade, desconto ou motivo gera `409`.
- Mesma chave e mesmo corpo reaplicados a outro pedido, comanda ou recurso geram `409`.
- Objetos semanticamente iguais com ordem JSON diferente geram o mesmo fingerprint.
- Representações monetárias e campos opcionais seguem regra explícita.
- Duas requisições simultâneas produzem uma operação.
- Nenhuma duplicação em estoque, financeiro, ticket, evento ou mapping.
- Registros anteriores sem fingerprint têm estratégia segura e testada.
- Falha/migração/rollback não apagam chaves existentes nem enfraquecem pagamentos.

## Ferramentas, visual, gates e Git

Inventarie ferramentas; instale apenas o necessário por fonte oficial, versão fixada e privilégio mínimo. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados de `vercel-labs/agent-skills`. Prova final vem do banco/runtime.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso local. Fallback só por bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Avalie e marque não aplicáveis Three.js, GSAP, Anime.js, Motion, ReactBits, 21st.dev, shadcn e getdesign.md, salvo feedback de conflito já suportado pela stack. Não redesenhe UI nem adicione dependência visual.

Execute testes focados/concorrentes, `npm run check`, `npm test`, smoke seguro com payload idêntico e divergente, auditoria, `git diff --check` e Compose isolado. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Não use produção.

Commits granulares só deste achado; push uma vez no fim após review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve o worktree alheio, não force, verifique remoto e política da branch.

Rubrica: rastreabilidade 25; correção/invariantes 25; testes 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Autoavalie após aprovação, corrija dentro da spec e repita até 100 ou ganho menor que 2. Relate trajetória, vetores canônicos, IDs, provas, commits, push e limites.
