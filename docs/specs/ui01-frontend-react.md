# UI-01: Modernizar o frontend operacional com React e design system consistente

## Problema e evidências
O painel operacional atual, implementado em Vanilla JS, concentra toda a lógica de estado, manipulação do DOM e chamadas de API de modo estruturalmente monolítico (`main.js` tem tamanho considerável e ausência de componentização). Embora a lógica funcional esteja sólida e cumpra contratos da API (SSE, proteção, RBAC, etc.), o frontend atual inviabiliza evoluções limpas, carece de testes automatizados dedicados de UI e não oferece as virtudes nativas de reatividade exigidas para escalar uma interface multi-perfil (Cozinha, Gerência, Caixa).

## Comportamento atual e desejado
- **Atual**: O painel é servido diretamente pelo `server.js` na raiz `/app/`, usando HTML/CSS/JS puros e estáticos. Interações redesenham o DOM de modo imperativo com seletores globais (`$`). O estado é compartilhado globalmente.
- **Desejado**: A aplicação será dividida em um SPA React TypeScript, buildada localmente por Vite, sem quebrar as restrições da API (SSE, CORS). Utilizaremos decomposição em Features e um Design System documentado (baseado em shadcn/ui). Tudo continuará sendo provido pelo `server.js` na mesma URI `/app/` com mesma autorização, porém com acessibilidade (WCAG 2.2 AA) robusta.

## Invariantes de Domínio e Segurança
- As permissões e validações RBAC, tokens CSRF via meta tags ou initial payload, e `SameSite` cookies de sessão não podem ser delegados ao cliente para checagem final. O client apenas consome e reage à API, jamais provando identidade isoladamente.
- As integrações e manipulações do carrinho só têm validade após `200/201` no back. Regras de preço, frete, descontos e estoques não sofrerão migração para front-end. O back continua atuando como a única fonte da verdade e o cliente como visualização.

## Estados e transições afetados
O projeto fará parse das views atuais:
- `auth`: Autenticação e bloqueios de sessão.
- `catalog/cart`: Composição dinâmica e idempotente de pedidos avulsos e itens de comandas.
- `orders`: Visão e manipulação do andamento de preparação e status.
- `finance`: Abertura e fechamento de caixa, e estornos.
- `integrations/admin`: Painel de controle de turnos e SKUs.
Estes formarão hooks modulares autônomos.

## Contratos HTTP e de Persistência afetados
O backend só altera o provisionamento dos estáticos:
- `GET /app/*` passa a entregar arquivos a partir de `apps/ops-web/dist/`, onde fica a build do Vite, respeitando MIME-types e roteamento SPAs (retornando `index.html` para `404` em caminhos do SPA, ou não, dependendo se usamos hash routing ou push state). Como é apenas dashboard, assumiremos que `/app/` servirá sempre `index.html` e usaremos React Router com basename.

## Estratégia de Migração e Compatibilidade
1. Extração do conteúdo atual de `apps/ops-web/` para cópia paralela se necessário (referência visual/logica).
2. Construção de um `Vite + React + TS` local.
3. Importação das assinaturas do back end para os hooks via utilitários.
4. Ajuste no `server.js` do pacote API para uso do `@fastify/static`.

## Arquivos e símbolos prováveis
- `apps/ops-web/`: Migração completa (novo pacote).
- `apps/api/src/server.js`: Ajustes em `app.get("/app", ...)` para suportar Fastify static.
- `apps/api/package.json`: Adição de `@fastify/static`.
- `docs/DESIGN.md`: Documento a ser construído definindo os tokens CSS e UX guidelines.

## Testes unitários, de integração, autorização e regressão
- Testes unitários (Vitest, RTL) nos hooks e visualizações primárias.
- Teste E2E (Playwright) para o funil primário (Login -> Catálogo -> Pedido).
- Reuso garantido da suíte HTTP preexistente (suíte `smoke`). A compatibilidade é estrita e a API não mudará semântica.
- axe-core será executado nos fluxos chaves para certificar WCAG 2.2 AA.

## Observabilidade e mensagens de erro
Erros na conversão do formulário seguirão o fluxo React com captura controlada (Error Boundaries) e apresentação de Toasts consistentes, mantendo a sobriedade exigida. O uso do `console.error` ou logging deve continuar mínimo e direcionado ao end-user apenas no que faz sentido operacionalmente.

## Riscos, Rollback e Fora de Escopo
- **Riscos**: Complexidade de setup e overhead na inicialização do SSE dentro do React Strict Mode pode causar duplicação temporária de chamadas de evento no Dev, lidaremos com cleanups robustos `useEffect`.
- **Rollback**: Retroceder o commit e remover `@fastify/static` do `server.js`.
- **Fora de Escopo**: Reescrita do back-end, implantação de Redux (usaremos Contextos/Hooks leves), adição massiva de bibliotecas 3D ou animações inúteis (não há aderência a Three.js ou GSAP aqui dado que o painel é de operação intensiva rápida, manter-se-á apenas o Framer-Motion levíssimo para Dialogs/Modals se aplicável).

## Critérios de Aceitação Verificáveis
1. Todos os fluxos atuais (Login, Catálogo, Pedido, Caixa, Cozinha) operam integralmente no novo SPA.
2. Acessibilidade certificada em `prefers-reduced-motion` e teclado.
3. O Bundle Inicial <= 250 KB após gzip.
4. Testes cobrem o roteamento interno, hooks e fluxos vitais sem mocking excessivo onde possível, MSW nas fronteiras do E2E se não estivermos com ambiente online completo, e API preservada no Smoke Test.
5. `DESIGN.md` reflete fielmente as restrições gráficas da interface.

## Autoavaliação e melhoria iterativa (Congelado antes do Build)
| Critério | Pontos |
|---|---:|
| Preservação funcional e contratos API/segurança | 20 |
| Acessibilidade e UX operacional | 20 |
| Coerência visual e fidelidade ao DESIGN.md próprio | 15 |
| Arquitetura React, composição e manutenibilidade | 15 |
| Desempenho, bundle, motion e uso responsável de 3D | 15 |
| Testes E2E/componentes/regressão visual | 10 |
| Disciplina de dependências, escopo, commit e documentação | 5 |
