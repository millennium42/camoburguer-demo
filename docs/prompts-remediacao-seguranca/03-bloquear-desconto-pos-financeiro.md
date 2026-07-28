# Prompt 03 — Bloquear desconto após efeito financeiro

> Use em tarefa isolada. Corrija somente este achado **P1**.

## Missão e contrato

Revalide o fluxo de desconto, conclusão, `finance_entries` e cancelamento. Preserve a imutabilidade econômica: após qualquer efeito financeiro, o total histórico não pode ser reescrito silenciosamente.

A spec deve decidir explicitamente entre:

- bloquear desconto após efeito financeiro, preferencialmente com `409`; ou
- lançar compensação contábil explícita e idempotente.

Não escolha silenciosamente. A verificação e a mutação devem ocorrer na mesma transação, com lock/isolamento que evite TOCTOU. Nunca edite lançamento histórico, use `float` para dinheiro ou “corrija” só a UI.

Incluído: rota de desconto, domínio, conclusão/cancelamento, ledger, concorrência, testes e docs.
Fora: refatoração financeira ampla, fiscal/CMV e demais achados.

## Execução com subagentes e skills

1. Leia `AGENTS.md`, arquitetura, ciclo do pedido, ciclo financeiro, pagamentos, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify para o caminho pedido → desconto → venda → cancelamento.
2. Subagente investigador somente leitura prova o estado atual e blast radius. Outro subagente de domínio/banco modela invariantes, concorrência, migração e testes, sem editar.
3. Execute **`/spec bloquear-desconto-pos-financeiro`**, criando somente `specs/bloquear-desconto-pos-financeiro.md` com `REQ/CON/EDGE/DONE`. Faça uma pergunta por mensagem se bloqueio versus compensação ou cancelamento de concluído não estiverem definidos.
4. Defina a rubrica antes da build. Um único escritor executa **`/build bloquear-desconto-pos-financeiro`** e a menor mudança necessária.
5. Reviewer independente executa **`/review bloquear-desconto-pos-financeiro`**, sem editar. Repita `/build` → `/review` até `APROVADA`, e então revisão linha a linha P0/P1/P2. `NÃO VERIFICADO`, P0 ou P1 bloqueiam.

## Aceite obrigatório

- Desconto antes de qualquer efeito financeiro continua conforme a spec.
- Após venda, tentativa de alteração falha/compensa conforme contrato, sem divergência entre pedido e ledger.
- Cenário venda 100 → tentativa de 50% → cancelamento integral termina com venda, eventual compensação/cancelamento e líquido final reconciliados em **exatamente zero**, sem tolerância monetária residual.
- Estados `completed` e `cancelled` rejeitam mutações incompatíveis conforme a spec, e a corrida em que o status muda antes da leitura do ledger continua serializável.
- Corrida entre desconto e conclusão produz apenas um estado serializável válido.
- Falha intermediária faz rollback integral; retries não duplicam compensação.
- Valores usam representação monetária existente e exata.
- Registros legados, migração, observabilidade e rollback são tratados.

## Ferramentas, frontend, gates e Git

Verifique ferramentas antes de instalar; use fonte oficial, versão fixada e privilégio mínimo. Utilize `codebase-memory-mcp` se disponível/vinculado e skills pertinentes auditados de `vercel-labs/agent-skills`; memória/grafo não substituem banco/testes.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, com versão/commit fixado, inspeção de scripts/permissões e prova de uso. Fallback só por bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Avalie Three.js, GSAP, Anime.js, Motion, ReactBits, 21st.dev, shadcn e getdesign.md e registre **não aplicável**, salvo se a spec exigir mensagem/estado visual mínimo. Não faça redesign nem adicione dependência visual a uma correção de integridade financeira.

Execute testes transacionais e concorrentes focados, `npm run check`, `npm test`, smoke seguro, auditoria pertinente, `git diff --check` e Compose isolado. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Commits granulares exclusivos; preserve mudanças alheias. Push uma vez ao final, apenas após review aprovada, gates verdes e P0=0/P1=0/P2=0, verificando remoto; nunca force. Confirme política de branch antes de usar `main`.

## Rubrica e relatório

Rastreabilidade 25; correção/invariantes 25; testes/regressões 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Após aprovação, pontue 0–100, liste perdas, corrija apenas dentro da spec, repita review se mudar código e reescreva o relatório até 100 ou ganho menor que 2. Mostre trajetória, matriz de IDs, provas, commits, push, rollback e limites.
