# Entrega Total CI E2E Docs

## Objetivo
Fechar a etapa final de publicação do Camoburguer Demo, tornando verificáveis no código e na CI remota os gates de frontend, E2E, acessibilidade e documentação ainda abertos, sem regredir os contratos já corrigidos no backend, no PostgreSQL e no smoke autenticado.

## Escopo
### Incluído
- CI oficial com instalação das dependências necessárias do frontend React.
- Execução oficial de Playwright e axe no commit final.
- Artefatos úteis de falha na CI.
- Documentação coerente com o shell React atual, o console legado publicado e os gates reais.
- Commit, push e verificação de status remoto do commit final.

### Fora do escopo
- Reescrever o funil legado inteiro para React nesta etapa.
- Adicionar bibliotecas visuais não necessárias ao fechamento dos gates.
- Alterar regras de domínio fora do que já está no workspace.

## Requisitos exatos
- REQ-001: O repositório deve ter um gate E2E oficial com Playwright executável por comando versionado.
- REQ-002: O gate E2E deve autenticar via `/app/`, provar o funil publicado de catálogo/pedido e verificar a visibilidade final no shell operacional.
- REQ-003: O repositório deve ter verificação automatizada de acessibilidade com axe nos fluxos-chave cobertos pelo shell React atual.
- REQ-004: O workflow de GitHub Actions deve instalar dependências suficientes para lint, typecheck, build, smoke e E2E em checkout limpo.
- REQ-005: O workflow oficial deve executar `check`, lint, typecheck, build, testes, audit, `git diff --check`, `test:db`, smoke e Playwright.
- REQ-006: O workflow oficial deve publicar artefatos úteis quando houver falha nos gates novos.
- REQ-007: `docs/DESIGN.md`, README e a documentação consolidada devem refletir fielmente a fronteira real entre `/app/` e `/app/legacy/`, os tokens visuais vigentes e os gates de CI realmente executados.

## Restrições
- CON-001: Nenhum requisito pode ser considerado atendido apenas porque existe código; deve haver comando ou status verificável.
- CON-002: O funil E2E desta etapa pode atravessar shell React e console legado, mas a documentação não pode fingir migração completa.
- CON-003: Não adicionar dependência ou etapa de CI que não seja necessária para provar os requisitos acima.

## Casos extremos e falhas
- EDGE-001: Se o navegador do Playwright não estiver instalado localmente, o setup deve ser reproduzível por comando explícito.
- EDGE-002: Se a CI falhar nos novos gates, os artefatos publicados devem permitir inspeção do Compose e do Playwright.
- EDGE-003: Se o shell React ainda delega partes do funil ao legado, o teste e a documentação devem explicitar essa dependência.

## Definição de concluído
- DONE-001: `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm audit --omit=dev`, `git diff --check`, `npm run test:db`, `npm run smoke` e `npm run test:e2e` passam localmente com evidência.
- DONE-002: O commit final é enviado para o remoto e possui status remoto verificável do GitHub Actions.
- DONE-003: A revisão final não encontra P0 nem P1 abertos nesta etapa e deixa qualquer risco residual explicitamente delimitado.
