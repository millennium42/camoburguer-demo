# Prompt 12 — Sincronizar mudanças externas da Delivery Much

> Use sozinho para este **P1**. Verifique no checkout as dependências mínimas: pedidos integrados não atravessam rotas manuais; transições usam invariantes compartilhadas; rede ocorre fora de transação; resultados ambíguos são reconciliados. Se faltar qualquer uma, bloqueie e reporte a dependência; não implemente os prompts 8 ou 10 aqui.

## Missão

Faça mudanças externas relevantes convergirem ao domínio local exatamente uma vez:

- tabela explícita Delivery Much → domínio, inclusive estado desconhecido;
- transições válidas e monotônicas;
- ativação/serviço central quando aplicável;
- detecção de item, valor ou endereço alterado mesmo sem mudança de status;
- deduplicação por ID/versão externa ou hash canônico, não `pedido:status`;
- estoque, ticket e eventos exatamente uma vez;
- conflito incompatível vai para reconciliação manual.

Incluído: polling, tradução, deduplicação, transições/efeitos, conflitos, testes e docs.
Fora: inventar contrato privado, chamadas de produção ou reescrever o parceiro.

## Fluxo obrigatório

1. Leia `AGENTS.md`, arquitetura, canais, ciclo do pedido, estoque, ticket, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify.
2. Subagente investigador somente leitura mapeia payloads/fixtures e transições. Outro especialista em domínio/testes produz matriz de estados, ordem, duplicidade e mudanças sem status.
3. Execute **`/spec sincronizacao-delivery-much`**, criando só `specs/sincronizacao-delivery-much.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem se o contrato privado ou uma tradução material estiver ausente; não invente.
4. Defina rubrica. Um escritor executa **`/build sincronizacao-delivery-much`** com mudança mínima.
5. Reviewer independente executa **`/review sincronizacao-delivery-much`**, sem editar. Repita até `APROVADA`; depois revisão linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Aceite, preparo, pronto e cancelamento externos convergem conforme matriz.
- Mudança de payload com status igual é detectada.
- Evento repetido não duplica estoque, ticket ou SSE.
- Evento fora de ordem não regride estado.
- Estado desconhecido é registrado/bloqueado, não aplicado silenciosamente.
- Conflito de valor/item/endereço tem regra explícita e auditável.
- Fixtures representam o contrato disponível; ausência de sandbox/contrato fica como limite, nunca como “provado”.
- Migração de dedupe legado e rollback são testados.

## Ferramentas e frontend

Instale só ferramentas oficiais indispensáveis e fixadas. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados de `vercel-labs/agent-skills`.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso local. Fallback só após bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md apenas se a spec incluir visualização de conflito/reconciliação. Motion/GSAP/Anime.js apenas acessível e mínimo; Three.js é não aplicável. Sem redesign/migração.

## Gates e publicação

Execute testes de contrato/fixtures/transição/deduplicação, `npm run check`, `npm test`, smoke isolado, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção e parceiro real são somente leitura/não chamados.

Commits granulares exclusivos; push único ao final com review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve alterações, não force e verifique refs/branch.

Rubrica: rastreabilidade 25; invariantes 25; testes 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Autoavalie e itere dentro da spec até 100 ou ganho menor que 2, com re-review após código. Relate trajetória, matriz externa→domínio, IDs, provas, commits, push e limites.
