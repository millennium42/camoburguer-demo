# Prompt 05 — Corrigir cancelamento manual na interface

> Use em uma nova tarefa. Escopo exclusivo deste **P1**.

## Missão

Revalide e corrija o encaminhamento do cancelamento no painel. A decisão deve usar o mapeamento real do pedido (`hasChannelMapping`), nunca apenas `source`.

- Pedido integrado: fluxo de integração e motivos externos.
- Pedido manual: `PATCH /orders/:id/status` com `cancelled`.
- UI só comunica sucesso após resposta real e recupera corretamente de falha.

Incluído: DTO necessário, handler/estado da UI, endpoints de motivos/cancelamento, testes DOM/E2E e documentação.
Fora: redesign geral, mudança do domínio de cancelamento e correções 8/9 além das interfaces estritamente necessárias.

## Fluxo obrigatório

1. Leia `AGENTS.md`, arquitetura, ciclo do pedido, canais, contexto operacional, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify para UI → API → integração.
2. Um subagente investigador, somente leitura, reproduz o clique de balcão, WhatsApp, OlaClick sem mapping e integrado. Outro subagente de testes projeta execução real do DOM/rede; busca textual em `main.js` não vale como prova.
3. Execute **`/spec corrigir-cancelamento-manual`**, criando apenas `specs/corrigir-cancelamento-manual.md` com `REQ/CON/EDGE/DONE`. Faça uma pergunta por mensagem só para ambiguidade material.
4. Defina a rubrica. Um único escritor executa **`/build corrigir-cancelamento-manual`**, com mudança mínima e sem editar a spec.
5. Outro subagente executa **`/review corrigir-cancelamento-manual`** de forma independente e sem editar. Repita `/build` → `/review` até `APROVADA`; depois revisão linha a linha P0/P1/P2. `NÃO VERIFICADO`, P0 ou P1 bloqueia.

## Aceite obrigatório

- Clique real para balcão, WhatsApp e OlaClick sem mapping chama apenas a rota manual.
- Pedido integrado chama apenas o fluxo externo correspondente.
- `404` de motivos externos nunca participa do caminho manual.
- A UI usa `hasChannelMapping` vindo de contrato confiável e trata ausência/inconsistência de forma segura.
- Erros, latência e duplo clique não geram sucesso falso ou cancelamento duplicado.
- Teste observa requests e estado final do DOM, não apenas strings.
- Migração/compatibilidade de DTO e rollback são definidos.

## Ferramentas e frontend

Verifique antes de instalar; use fontes oficiais, versões fixadas e mínimo privilégio. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados do `vercel-labs/agent-skills`; grafos e memória são orientação.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, com versão/commit fixado, inspeção de scripts/permissões e prova de uso local. Fallback só após bloqueio documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md para padrões de diálogo destrutivo, feedback, foco e erro. Consulte Motion/GSAP/Anime.js apenas para transições discretas com `prefers-reduced-motion`; Three.js é não aplicável. Não instale todas as bibliotecas, não migre framework e não transforme a correção em redesign. Registre licença, acessibilidade, bundle e escolha/rejeição.

## Gates, Git e saída

Execute testes DOM/E2E focados, `npm run check`, `npm test`, smoke seguro, auditoria pertinente, `git diff --check` e Compose isolado. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Commits granulares exclusivos. Push uma vez ao final, somente após review aprovada, gates verdes e P0=0/P1=0/P2=0; preserve alterações alheias, não force, confirme remoto e política da branch.

Rubrica prévia: rastreabilidade 25; correção 25; testes/regressões 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Após aprovação, pontue 0–100, corrija perdas dentro da spec, repita review se mudar código e reescreva o relatório até 100 ou ganho menor que 2. Apresente trajetória, IDs, requests observadas, acessibilidade, commits, push e limites.
