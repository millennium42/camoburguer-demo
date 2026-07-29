# Ops Web

Shell React operacional publicado pela API em `/app/`.

## Papel atual

- autenticação por sessão real via `/auth/login` e restauração por `/auth/me`;
- leitura operacional de pedidos, cozinha, comandas, estoque, caixa, integrações e auditoria;
- convivência explícita com o console legado publicado em `/app/legacy/` para o funil completo de catálogo e pedido enquanto a migração segue aberta.

## Comandos úteis

- `npm --prefix apps/ops-web ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Contratos que não podem regredir

- cookies `HttpOnly` + `SameSite=Strict` continuam sendo a fonte de identidade;
- CSRF fica apenas em memória no cliente;
- o shell React não reimplementa regras finais de preço, estoque, caixa ou RBAC;
- o design vivo e os tokens canônicos estão em `docs/DESIGN.md`.
