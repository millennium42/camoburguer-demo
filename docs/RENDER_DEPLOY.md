# Deploy da demo no Render

## Limite de uso

O Blueprint publica uma **demo com dados sintéticos**. Ele não adiciona login ao painel/API e o bridge hospedado não alcança a impressora da cozinha. Não habilite iFood/Delivery Much nem grave dados reais antes dos gates da [auditoria técnica](auditoria-tecnica-2026-07-21.md).

## Recursos

| Recurso | Tipo | Função |
|---|---|---|
| `camoburguer-db` | PostgreSQL gerenciado | dados da demo |
| `camoburguer-api` | web service Node | API, schema, SSE e pollers desabilitados |
| `camoburguer-bridge` | web service Node | spool remoto demonstrativo |
| `camoburguer-ops-web` | static site | interface do operador |

URLs esperadas:

- `https://camoburguer-ops-web.onrender.com`
- `https://camoburguer-api.onrender.com`
- `https://camoburguer-bridge.onrender.com`

## O que o Blueprint protege

- health checks explícitos da API e bridge;
- CORS limitado ao domínio do `ops-web`;
- headers CSP, frame, referrer, permissions e `nosniff` no site;
- `PRINT_BRIDGE_TOKEN` aleatório gerado no bridge e referenciado pela API;
- comunicação API → bridge pelo hostname privado do Render;
- `DEMO_ADMIN_TOKEN` gerado para seed/anonimização;
- bridge recusa startup em produção sem token.

O Render recomenda segredos gerados ou fornecidos fora do repositório e permite copiar uma env var por `fromService.envVarKey`: [Blueprint YAML Reference](https://render.com/docs/blueprint-spec).

## Aplicação do Blueprint

1. Revisar/commitar/pushar as mudanças desejadas.
2. No Render, criar ou sincronizar um Blueprint apontando para `render.yaml`.
3. Confirmar banco e três serviços.
4. Aguardar todos os health checks.
5. Verificar os logs do primeiro boot.
6. Confirmar que o frontend servido contém o commit esperado.

Não presuma que editar `render.yaml` altera serviços existentes imediatamente. Em Blueprint já criado, revisar o diff de sincronização e as variáveis no Dashboard.

## Variáveis da API

| Variável | Configuração | Observação |
|---|---|---|
| `DATABASE_URL` | `fromDatabase` | conexão privada gerenciada |
| `PORT` | `3001` | Render pode expor porta dinamicamente; o processo lê env |
| `NODE_ENV` | `production` | ativa exigências de segurança do bridge correspondente |
| `PRINT_BRIDGE_URL` | `fromService.hostport` | `config.js` acrescenta `http://` ao host privado |
| `PRINT_BRIDGE_TOKEN` | `fromService.envVarKey` | mesmo segredo gerado no bridge |
| `CORS_ORIGINS` | URL exata do ops web | lista separada por vírgula |
| `DEMO_ADMIN_TOKEN` | `generateValue: true` | não expor no frontend |
| `AUTO_SEED` | `true` na demo | só roda quando não existe turno |

## Variáveis da bridge

| Variável | Configuração | Observação |
|---|---|---|
| `NODE_ENV` | `production` | token passa a ser obrigatório |
| `PRINT_BRIDGE_TOKEN` | `generateValue: true` | API o referencia, não hardcode |
| `PORT` | `3100` | health em `/health` |

O filesystem de um web service pode ser efêmero. O arquivo de spool demonstra idempotência, não persistência de impressão nem integração física.

## Seed

Com `AUTO_SEED=true`, um banco sem turnos recebe dados sintéticos uma vez. O seed:

- executa em transação;
- trunca tabelas operacionais da demo;
- zera estoque;
- registra abertura de R$ 150,00;
- usa nomes e endereços explicitamente demonstrativos.

`POST /demo/seed` fica desabilitado sem `DEMO_ADMIN_TOKEN` e exige bearer ou `x-admin-token`. Não use essa rota em ambiente com dados que devam ser preservados.

## Integrações externas

Mantenha:

```env
IFOOD_ENABLED=false
DELIVERYMUCH_ENABLED=false
```

O processo falha cedo se uma integração habilitada estiver sem campos obrigatórios. Antes de ligar uma flag, cumprir os gates de autenticação da API, fixtures e sandbox descritos no roteiro de produção.

## Verificação somente leitura

No Ubuntu/WSL:

```bash
rtk proxy curl --fail https://camoburguer-api.onrender.com/health
rtk proxy curl --fail https://camoburguer-api.onrender.com/catalog
rtk proxy curl --fail https://camoburguer-bridge.onrender.com/health
```

No navegador:

- confirmar o hash/versão implantada nos logs;
- navegar por pedidos, comandas, estoque, cozinha e financeiro;
- confirmar que “Reconectando atualizações...” volta para conectado;
- conferir console e network sem erro de CORS/CSP;
- não executar seed/anonimização em banco a preservar.

## Troubleshooting

| Sintoma | Diagnóstico | Ação segura |
|---|---|---|
| API falha com `seed-demo.mjs` | imagem/commit anterior ao Dockerfile corrigido | redeploy do commit auditado |
| Bridge falha no boot por token | `PRINT_BRIDGE_TOKEN` não foi gerado/referenciado | sincronizar Blueprint e conferir env vars |
| API não alcança bridge | host privado/secret divergente | conferir `fromService`, health e logs, sem publicar token |
| Frontend fica reconectando | SSE/CORS ou deploy antigo | inspecionar header ACAO e commit implantado |
| Financeiro mostra R$ 15.000 | seed antigo | não truncar automaticamente; migrar/corrigir dados conscientemente |
| `401` no bridge | bearer ausente/divergente | corrigir segredo compartilhado; não desabilitar auth |
| CORS no domínio customizado | origem não está em `CORS_ORIGINS` | adicionar origem exata e redeployar API |

## Rollback

1. selecionar o deploy anterior no Render;
2. não executar seed durante rollback;
3. verificar compatibilidade do schema antes de voltar código;
4. preservar logs e snapshot/backup do banco;
5. executar health e fluxo somente leitura;
6. registrar causa e decisão.

O schema atual ainda é aplicado no boot e não oferece downgrade formal. Migrations versionadas e restore testado são pré-requisitos de produção.
