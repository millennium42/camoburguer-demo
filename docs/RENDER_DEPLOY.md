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
| `AUTO_SEED` | `false` | valor obrigatório; outro valor impede o boot |
| `APP_ENV` | `demo` | gate de ambiente, insuficiente isoladamente |
| `DEMO_SEED_ENABLED` | `false` | habilitar apenas durante operação explícita aprovada |
| `DEMO_SEED_TARGET` | vazio | identidade exata resolvida, sem usuário ou senha |

## Variáveis da bridge

| Variável | Configuração | Observação |
|---|---|---|
| `NODE_ENV` | `production` | token passa a ser obrigatório |
| `PRINT_BRIDGE_TOKEN` | `generateValue: true` | API o referencia, não hardcode |
| `PORT` | `3100` | health em `/health` |

O filesystem de um web service pode ser efêmero. O arquivo de spool demonstra idempotência, não persistência de impressão nem integração física.

## Seed

Não existe seed no boot. `AUTO_SEED` deve permanecer `false`, inclusive em rollback.
Para migrar um deploy antigo, altere primeiro essa variável, faça redeploy e confirme que
o health sobe sem criar dados demonstrativos.

`POST /demo/seed` exige bearer ou `x-admin-token`, `APP_ENV=demo`,
`DEMO_SEED_ENABLED=true`, `DEMO_SEED_TARGET` sem credenciais e o mesmo alvo em
`confirmTarget` no corpo. A operação resolve o alvo no PostgreSQL e, em uma única
transação, bloqueia em ordem fixa e verifica as 13 tabelas. Qualquer estado operacional,
estoque não zero ou catálogo divergente retorna recusa sem mutação. O alvo resolvido pode
ser obtido nos logs sanitizados de uma recusa controlada; nunca copie `DATABASE_URL`.

Depois de uma carga aprovada, volte `DEMO_SEED_ENABLED=false` e faça redeploy. Não use
essa operação em produção ou staging compartilhado.

O commit `f3191d3`, que fixa `AUTO_SEED=false` no Render, não faz parte de nenhum
rollback permitido. Rollback de aplicação deve preservá-lo.

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
2. manter `AUTO_SEED=false` e `DEMO_SEED_ENABLED=false`;
3. verificar compatibilidade do schema antes de voltar código;
4. preservar logs e snapshot/backup do banco;
5. executar health e fluxo somente leitura;
6. registrar causa e decisão.

O schema atual ainda é aplicado no boot e não oferece downgrade formal. Migrations versionadas e restore testado são pré-requisitos de produção.
