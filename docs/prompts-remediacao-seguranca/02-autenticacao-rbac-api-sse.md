# Prompt 02 — Autenticação obrigatória e RBAC na API/SSE

> Cole este prompt integralmente em uma nova tarefa do Codex. Trabalhe apenas nesta correção **P0**.

## Missão

Revalide e feche por padrão a API operacional e os streams SSE do `camoburguer-demo`. CORS, Helmet e rate limit não são autenticação. Nenhum cliente anônimo pode ler ou alterar pedidos, comandas, estoque, caixa, financeiro, clientes ou eventos.

Resultado obrigatório:

- autenticação obrigatória por padrão, com exceções públicas explícitas;
- sessão segura ou JWT de curta duração, conforme decisão documentada na spec;
- RBAC mínimo para operador, cozinha e administrador;
- matriz rota × papel;
- identidade do operador persistida em ações sensíveis;
- SSE autenticado antes de enviar qualquer dado;
- `401` para ausência/invalidade e `403` para papel insuficiente.

Incluído: API, SSE, credenciais/sessão, RBAC, auditoria de identidade, UI mínima de autenticação e testes.
Fora: provedor SSO corporativo, gestão avançada de usuários e redesign geral.

## Fluxo obrigatório com subagentes

1. Leia `AGENTS.md`, docs centrais de arquitetura/operação/canais/pedido/financeiro, auditoria e workflow. Use WSL e `rtk`; use `m1nd` primeiro e Graphify para rota, SSE e blast radius. Revalide toda afirmação no checkout.
2. Delegue, sem edição: (a) inventário completo de rotas e streams; (b) threat model defensivo e matriz de autorização; (c) estratégia de testes de API/SSE e lockout. Produção é somente leitura; não faça enumeração ofensiva externa.
3. Execute **`/spec autenticacao-rbac-api-sse`**. O skill cria somente `specs/autenticacao-rbac-api-sse.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem apenas para decisões materiais, como sessão versus JWT, bootstrap do primeiro admin, transporte do token no SSE e expiração. Não invente credenciais.
4. Defina a rubrica antes da build. Depois execute **`/build autenticacao-rbac-api-sse`** com um único subagente escritor. Menor mudança suficiente, sem modificar a spec ou fazer limpezas oportunistas.
5. Um subagente independente executa **`/review autenticacao-rbac-api-sse`**, sem editar e sem confiar no relatório do builder. Deve testar cada ID. `NÃO VERIFICADO` reprova.
6. Repita `/build` → `/review` até `APROVADA`; depois faça revisão independente linha a linha P0/P1/P2. Não avance com P0/P1, revisão incompleta ou bypass não classificado.

## Critérios mínimos

- Default deny comprovado para todas as rotas atuais e para uma rota de teste não classificada.
- Matriz automatizada cobre pedidos, comandas, estoque, caixa, financeiro, clientes, integrações, administração e SSE.
- Cozinha não acessa caixa/admin; operador não executa ações exclusivas de admin.
- Sessão/token expirado perde API e stream; reconnect não vaza eventos.
- Nenhum token duradouro em query string, local inseguro ou logs; segredos vêm de configuração segura.
- `requireDemoAdmin` é preservado ou migrado com testes explícitos.
- Bootstrap, rotação, revogação, rate limit de login, CSRF quando aplicável, migração e rollback são especificados.
- A identidade do ator aparece em trilhas sensíveis sem expor segredo ou PII desnecessária.

## Ferramentas e frontend

Verifique antes de instalar. Use apenas fontes oficiais, versões fixadas e mínimo privilégio. Utilize `codebase-memory-mcp` quando disponível e vinculado; grafos/memória orientam, não provam. Inspecione e use skills pertinentes do `vercel-labs/agent-skills`, após auditoria.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`: fixe versão/commit, inspecione scripts/permissões e prove uma consulta/invocação. Fallback só após bloqueio técnico/de autoridade documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Como há UI de autenticação, pesquise padrões em ReactBits, 21st.dev, shadcn e getdesign.md e boas práticas nas fontes oficiais de Motion, GSAP, Anime.js e Three.js. Escolha a menor combinação compatível com a stack atual; não instale todas. Priorize semântica, teclado, foco, contraste, estados de erro e `prefers-reduced-motion`. Three.js e animações ornamentais só entram se a spec provar valor operacional; não migre o frontend nem aumente a superfície de ataque por estética. Registre alternativas aceitas/rejeitadas, licença, bundle e impacto.

## Gates, Git e publicação

Execute testes focados de autenticação/RBAC/SSE, `npm run check`, `npm test`, smoke autenticado seguro, auditoria de dependências, `git diff --check` e Compose isolado. Atualize documentação/variáveis de exemplo sem segredos; rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir.

Preserve mudanças preexistentes. Commits granulares só deste achado. Nada de credenciais, tokens ou artefatos locais. Push uma vez ao final da correção, apenas após review aprovada, gates verdes e P0=0/P1=0/P2=0; sem force-push e com verificação de `HEAD`/remoto/worktree. Respeite a política de branch atual, usando commits sequenciais em `main` apenas se confirmada.

## Rubrica e saída

Rubrica prévia: rastreabilidade 25; correção/invariantes 25; testes/regressões 20; segurança/migração/rollback 15; simplicidade/manutenção 10; evidências 5.

Após aprovação, dê nota 0–100, liste perdas, corrija fraquezas dentro da spec, reexecute review se houver código novo e reescreva o relatório. Pare em 100 ou quando o ganho de uma rodada for menor que 2. Entregue matriz de IDs, matriz rota × papel, evidências, P0/P1/P2, migração/rollback, commits, push verificado, limites e trajetória das notas.
