---
tags: [infra, deploy, render]
---

# Deploy e Infraestrutura — Camoburguer Demo

> O Blueprint atual publica uma demo com dados sintéticos. O painel e a API
> exigem sessão RBAC, e o bridge hospedado não alcança a impressora da cozinha.
> Não habilite iFood/Delivery Much nem grave dados reais antes de concluir os
> gates detalhados neste documento.

---

# Guia de uso

## Recursos implantados (Render)

| Recurso | Tipo | Função |
|---|---|---|
| `camoburguer-db` | PostgreSQL gerenciado | Dados da demo |
| `camoburguer-api` | Web service Node | Painel em `/app/`, API, schema; SSE/pollers desabilitados |
| `camoburguer-bridge` | Web service Node | Spool remoto demonstrativo |

URLs esperadas:
- `https://camoburguer-api.onrender.com/app/` (Interface)
- `https://camoburguer-api.onrender.com` (API)
- `https://camoburguer-bridge.onrender.com` (Bridge)

## Verificação pós-deploy (somente leitura)

No Ubuntu/WSL:
```bash
rtk proxy curl --fail https://camoburguer-api.onrender.com/health
rtk proxy curl --fail https://camoburguer-api.onrender.com/catalog
rtk proxy curl --fail https://camoburguer-bridge.onrender.com/health
```

No navegador:
1. Confirmar hash/versão nos logs.
2. Navegar pelas áreas do painel (Pedidos, Comandas, Estoque, Cozinha, Financeiro).
3. Confirmar que "Reconectando atualizações..." volta para conectado.
4. Conferir console e network sem erro de CORS/CSP.

## Troubleshooting

| Sintoma | Diagnóstico | Ação segura |
|---|---|---|
| API falha com `seed-demo.mjs` | Imagem/commit anterior ao Dockerfile corrigido | Redeploy do commit auditado |
| Bridge falha no boot por token | `PRINT_BRIDGE_TOKEN` não foi gerado/referenciado | Sincronizar Blueprint e conferir env vars |
| API não alcança bridge | Host privado/secret divergente | Conferir `fromService`, health e logs, sem publicar token |
| Frontend fica reconectando | SSE/CORS ou deploy antigo | Inspecionar header ACAO e commit implantado |
| Financeiro mostra R$ 15.000 | Seed antigo | Não truncar; migrar/corrigir dados conscientemente |
| `401` no bridge | Bearer ausente/divergente | Corrigir segredo compartilhado; não desabilitar auth |
| CORS no domínio customizado | Origem não está em `CORS_ORIGINS` | Adicionar origem exata e redeployar API |

---

# Guia de desenvolvimento

## O que o Blueprint protege

- Build da API usa apenas `npm ci`; console legado é servido a partir de `apps/ops-web-legacy/`.
- Health checks explícitos na API e bridge.
- Painel e API compartilham origem (compatíveis com `SameSite=Strict`).
- Headers Helmet, frame, referrer, permissions e `nosniff`.
- `PRINT_BRIDGE_TOKEN` aleatório gerado no bridge e referenciado pela API (`generateValue` e `fromService.envVarKey`).
- Comunicação API → bridge pelo hostname privado do Render.
- `ADMIN_BOOTSTRAP_PASSWORD` gerado para o primeiro administrador.
- Bridge recusa startup em produção sem token.

## Variáveis da API

| Variável | Configuração | Observação |
|---|---|---|
| `DATABASE_URL` | `fromDatabase` | Conexão privada gerenciada |
| `PORT` | `3001` | O processo lê a env, pois o Render pode expor porta dinamicamente |
| `NODE_ENV` | `production` | Ativa exigências de segurança |
| `PRINT_BRIDGE_URL` | `fromService.hostport` | `config.js` acrescenta `http://` |
| `PRINT_BRIDGE_TOKEN` | `fromService.envVarKey` | Referencia segredo do bridge |
| `CORS_ORIGINS` | URL exata do serviço | Painel e API compartilham a origem |
| `ADMIN_BOOTSTRAP_PASSWORD` | `generateValue: true` | Bootstrap único |
| `AUTO_SEED` | `false` | **Obrigatório;** outro valor impede o boot |
| `APP_ENV` | `demo` | Gate de ambiente |
| `DEMO_SEED_ENABLED` | `false` | Habilitar apenas para operação explícita |
| `DEMO_SEED_TARGET` | vazio | Resolve identidade sem expor credenciais |

## Rollback

1. Selecionar o deploy anterior no Render.
2. Manter `AUTO_SEED=false` e `DEMO_SEED_ENABLED=false`.
3. Verificar compatibilidade do schema antes de voltar código (não há downgrade formal).
4. Preservar logs e backup do banco.
5. Executar verificação somente leitura.
6. Registrar causa e decisão.

## Roteiro da demo à produção

Este roteiro é ordenado por risco e dependência. Não introduza Redis, fila ou Kubernetes antes de uma métrica provar a necessidade.

### Gate 0 — Fechar a exposição pública (P0)
- Autenticação real do operador diante de API e SSE.
- Autorização para seed, anonimização, ajustes, caixa e reprocessamento.
- Nenhuma chave embutida no frontend estático.
- Auditoria de quem fez cada ação sensível.
- Política de sessão (expiração/recuperação).
- Teste que prova `401/403` nas rotas protegidas.
- **Opção recomendada:** proxy/identity-aware access suportado pelo provedor ou um BFF/login pequeno.

### Gate 1 — Dados e operação recuperável
- Extrair o `schemaSql` para migrations numeradas (testadas em banco legado).
- Backup/PITR no PostgreSQL, com teste de restore registrado.
- Separar seed de demo de ambientes com dados reais.
- Retenção/anonimização LGPD com dry-run.
- Timezone operacional fixado em `America/Sao_Paulo`.

### Gate 2 — Homologação iFood
1. Credenciais de sandbox e merchant de teste.
2. Fixtures sanitizadas de token, evento, detalhe e erro.
3. Testar polling (30s), duplicata e fora de ordem.
4. Provar commit local antes do ACK e retry.
5. Provar aceite, cancelamento, início de preparo e pronto.
6. Reconciliar comando `failed` e evento desconhecido.

### Gate 3 — Homologação Delivery Much
1. Acesso ao contrato privado (Postman/portal).
2. Fixar rotas documentadas; congelar fixtures de auth, lista, receive, accept, ready e cancel.
3. Testar deduplicação `pedido:status`, reentrega e retry.
4. Definir polling vs. webhook conforme o contrato.
5. Habilitar após sandbox e reconciliação.

### Gate 4 — Worker/outbox observável
Separar o poller se: deploy interromper polling, lag mensurável, reprocessamento manual necessário ou SLA do parceiro exigir.
- Lease/advisory lock por canal.
- Outbox persistente para comandos.
- Backoff, dead-letter e reprocessamento manual.
- Correlação por `channel`, `merchantId`, `externalOrderId`, etc.
- Métricas, alertas e runbook.

### Gate 5 — Impressão real
1. Inventariar impressora, interface e SO da cozinha.
2. Agente local outbound-only autenticado.
3. Implementar ESC/POS atrás do bridge.
4. Provar queda de internet, papel ausente e reprint.
5. Documentar contingência manual.

### Gate 6 — Release operacional
- CI verde (unitários, smoke autenticado, axe).
- Teste visual (desktop e 390px).
- Confirmação do console legado em `/app/`.
- Sandbox dos parceiros aprovado (ou flags desligadas).
- Carga representativa de jantar testada.
- Alertas, plantão e aprovação explícita do responsável.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[canais-e-captura.md](canais-e-captura.md) ·
[guia-de-desenvolvimento.md](guia-de-desenvolvimento.md)
