# Prompt 13 — Anonimização LGPD completa e verificável

> Use em tarefa isolada para este **P1**. Esta tarefa não autoriza aconselhamento jurídico nem promessa sem prova.

## Missão

Impeça a resposta falsa de anonimização enquanto PII continua recuperável. Primeiro produza inventário verificável de todas as cópias; depois aplique a política decidida para:

- pedidos/comandas e metadados;
- `finance_entries`;
- mappings, eventos e payloads externos;
- tickets persistidos e spool;
- logs;
- backups conforme política real de retenção.

Para cada campo, a spec define apagar, anonimizar irreversivelmente, pseudonimizar ou reter por obrigação documentada. Banco deve ser transacional. Pendências assíncronas precisam ser explícitas; auditoria não pode reintroduzir PII.

Incluído: inventário de PII, operação, artefatos fora do banco, resposta/estado, retenção, testes e docs.
Fora: apagar backups sem mecanismo provado, excluir registros legalmente obrigatórios por suposição ou declarar conformidade jurídica total.

## Orquestração

1. Leia `AGENTS.md`, arquitetura, contexto operacional, ciclos, ticket, integrações, auditoria e política LGPD existente. Use WSL + `rtk`, `m1nd` primeiro e Graphify para fluxo/cópias de dados.
2. Subagente investigador somente leitura faz data-flow de PII. Outro subagente de segurança/privacidade e outro de testes revisam inventário, retenção, canários e falhas. Nenhum edita.
3. Execute **`/spec anonimizacao-lgpd-completa`**, criando apenas `specs/anonimizacao-lgpd-completa.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem para toda decisão jurídica/retencional material. Não invente obrigação.
4. Defina rubrica. Um único escritor executa **`/build anonimizacao-lgpd-completa`**.
5. Reviewer independente executa **`/review anonimizacao-lgpd-completa`**, sem editar e com busca própria. Repita até `APROVADA`; revisão final linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Canários únicos inseridos em cada superfície deixam de ser recuperáveis conforme a política.
- Busca estruturada e textual em JSON, metadata, eventos, tickets e spool não encontra canário anonimizado.
- Falha intermediária no banco não deixa anonimização parcial.
- Artefatos fora do banco são sanitizados/excluídos ou aparecem como pendência honesta.
- Dados retidos por obrigação são distinguidos de dados anonimizados.
- Resposta `success` só ocorre quando destinos síncronos obrigatórios terminam; assíncronos têm estado consultável.
- Logs/telemetria não recebem PII nova; backups têm limites declarados e testáveis.
- Migração, reprocessamento e idempotência são definidos. Rollback cobre apenas código/migração ainda não aplicada; anonimização concluída é irreversível e não pode manter ou restaurar cópia reversível de PII.

## Ferramentas, frontend e segurança

Instale apenas ferramentas oficiais indispensáveis, fixadas e mínimas; nunca envie PII real a SaaS/MCP. Use `codebase-memory-mcp` só se vinculado e sem indexar dados pessoais; skills de `vercel-labs/agent-skills` devem ser auditados.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso apenas sobre código/dados sintéticos. Fallback só após bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Consulte ReactBits, 21st.dev, shadcn e getdesign.md apenas para estados honestos de progresso/pendência/erro. Motion/GSAP/Anime.js somente mínimo e acessível; Three.js é não aplicável. Não faça redesign.

## Gates, Git e relatório

Use dados sintéticos/canários em banco efêmero. Execute testes transacionais e de busca, `npm run check`, `npm test`, smoke seguro, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura; não copie PII.

Commits granulares exclusivos; push uma vez no fim apenas com review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve mudanças, sem force, confirme refs/branch.

Rubrica 25/25/20/15/10/5. Após aprovação, pontue, corrija dentro da spec, re-review e reescreva relatório até 100 ou ganho menor que 2. Entregue inventário por superfície, matriz de canários/IDs, limites legais/técnicos, migração/rollback, commits, push e trajetória; nunca alegue eliminação não provada.
