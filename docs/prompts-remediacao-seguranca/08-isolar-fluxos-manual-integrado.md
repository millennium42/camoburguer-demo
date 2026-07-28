# Prompt 08 — Isolar pedidos manuais e integrados

> Use sozinho para este **P1**. Faça blast radius antes de qualquer centralização.

## Missão

Impeça que pedidos externos sejam criados ou alterados fora do contrato do parceiro:

- `/orders` manual rejeita `ifood` e `deliverymuch`;
- UI usa `hasChannelMapping`, não apenas `source`;
- rota genérica de status bloqueia pedidos mapeados e origens externas;
- transições convergem para serviço de aplicação único ou invariantes realmente compartilhadas;
- `received → confirmed` integrado baixa estoque exatamente uma vez;
- comando externo, estado local, eventos e ticket permanecem coerentes.

Incluído: contrato de criação/status, mappings, DTO/UI, serviço de transição, efeitos e testes.
Fora: reescrita completa das integrações e migração destrutiva de legado.

## Orquestração

1. Leia `AGENTS.md`, arquitetura, canais, ciclo do pedido, estoque, ticket, integrações, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify `query/path/explain`.
2. Subagente investigador somente leitura mapeia todas as transições e caminhos paralelos. Outro subagente de domínio/testes identifica dupla baixa, legado e matriz de origens.
3. Execute **`/spec isolar-fluxos-manual-integrado`**, criando só `specs/isolar-fluxos-manual-integrado.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem quando o tratamento de legado ou a fronteira do serviço forem materiais.
4. Defina a rubrica. Um único escritor executa **`/build isolar-fluxos-manual-integrado`** com a menor alteração coerente.
5. Reviewer independente executa **`/review isolar-fluxos-manual-integrado`**, sem editar. Repita até `APROVADA`; finalize com revisão linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Origem externa na rota manual falha sem pedido, mapping, estoque, financeiro, ticket ou evento.
- Pedido mapeado não pode ser confirmado/cancelado pela rota genérica.
- Fluxo integrado emite o comando correto e baixa estoque uma vez.
- Origens manuais válidas continuam funcionando.
- Registros legados externos sem mapping são detectados e tratados de forma não destrutiva.
- Concorrência/replay não atravessa as fronteiras.
- UI e API usam o mesmo fato de integração, com fallback seguro.

## Ferramentas, frontend, gates e Git

Instale somente ferramenta indispensável, oficial, fixada e com mínimo privilégio. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados de `vercel-labs/agent-skills`; valide diretamente.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso local. Fallback só após bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md somente para comunicar o tipo/estado do pedido sem ambiguidade. Motion/GSAP/Anime.js/Three.js são não aplicáveis salvo decisão explícita da spec; sem redesign ou migração.

Execute testes de contrato/domínio/integração/UI, `npm run check`, `npm test`, smoke, auditoria, `git diff --check` e Compose isolado. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Commits granulares exclusivos; push único ao final com review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve mudanças, não force, verifique remoto e branch.

Rubrica: rastreabilidade 25; invariantes 25; testes 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Autoavalie e itere dentro da spec até 100 ou ganho menor que 2; re-review após código. Entregue trajetória, matriz de origens/IDs, provas, commits, push e limites.
