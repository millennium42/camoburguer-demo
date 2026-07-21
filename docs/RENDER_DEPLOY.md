# 🚀 Guia de Deploy no Render

> **Deploy automatizado do Camoburguer via Blueprint em 1 clique.**

---

## Arquitetura no Render

```
                           ┌─────────────────────────┐
                           │   GITHUB REPOSITÓRIO    │
                           │   (render.yaml)         │
                           └────────────┬────────────┘
                                        │ Blueprint
                                        ▼
                ┌───────────────────────────────────────────────┐
                │                 RENDER PAAS                   │
                └───────┬───────────────┬───────────────┬───────┘
                        │               │               │
                        ▼               ▼               ▼
               ┌─────────────────┐ ┌─────────┐ ┌─────────────────┐
               │  PostgreSQL DB  │ │ API Core│ │ Print-Bridge    │
               │ camoburguer-db  │ │ Fastify │ │ Fastify         │
               └─────────────────┘ └────┬────┘ └─────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ Ops Web Static  │
                               │ (CDN + Headers) │
                               └─────────────────┘
```

### Serviços Provisionados

| Serviço | Tipo | URL Pública |
|---|---|---|
| `camoburguer-db` | PostgreSQL gerenciado | (interno) |
| `camoburguer-api` | Web Service Node.js | `https://camoburguer-api.onrender.com` |
| `camoburguer-bridge` | Web Service Node.js | `https://camoburguer-bridge.onrender.com` |
| `camoburguer-ops-web` | Static Site (CDN) | `https://camoburguer-ops-web.onrender.com` |

---

## Passo a Passo

### 1. Preparar o Repositório

Garantir que `render.yaml` está na raiz e o repositório está atualizado no GitHub.

### 2. Criar Blueprint no Render

1. Acesse [render.com](https://render.com/) → **New +** → **Blueprint**
2. Conecte o repositório `camoburguer-demo`
3. Defina o nome do grupo (ex: `camoburguer-demo`)
4. O Render identifica os 4 serviços do `render.yaml`
5. Clique em **Apply**

### 3. Acompanhar o Build

- O Render cria o banco PostgreSQL e compila os Web Services
- Em ~2-3 minutos, todos os serviços ficam **Live**
- A API executa migrações do schema automaticamente no boot

### 4. Dados de Demonstração

A API detecta banco vazio automaticamente e executa o seed:

```
Banco de dados vazio detectado. Executando seed de demonstração automaticamente...
```

> A variável `AUTO_SEED=true` está configurada no `render.yaml`. Para desabilitar, remova ou defina como `false`.

---

## Variáveis de Ambiente

### API (`camoburguer-api`)

| Variável | Origem | Descrição | Valor |
|---|---|---|---|
| `DATABASE_URL` | Automático (Blueprint) | Conexão PostgreSQL | `postgres://...` |
| `PORT` | Predefinido | Porta da API | `3001` |
| `NODE_ENV` | Predefinido | Ambiente | `production` |
| `PRINT_BRIDGE_URL` | Predefinido | URL do Print Bridge | `https://camoburguer-bridge.onrender.com` |
| `DEFAULT_PRINTER` | Predefinido | Impressora padrão | `cozinha-principal` |
| `AUTO_SEED` | Predefinido | Seed automático no boot | `true` |

### Integrações Opcionais (iFood / Delivery Much)

```env
# Delivery Much
DELIVERYMUCH_ENABLED=true
DELIVERYMUCH_AUTH_URL=https://auth.deliverymuch.com.br
DELIVERYMUCH_API_URL=https://api.deliverymuch.com.br
DELIVERYMUCH_CLIENT_ID=seu_client_id
DELIVERYMUCH_CLIENT_SECRET=seu_client_secret
DELIVERYMUCH_USERNAME=seu_usuario
DELIVERYMUCH_PASSWORD=sua_senha
DELIVERYMUCH_COMPANY_UUID=seu_company_uuid

# iFood Merchant API
IFOOD_ENABLED=true
IFOOD_API_URL=https://merchant-api.ifood.com.br
IFOOD_CLIENT_ID=seu_client_id
IFOOD_CLIENT_SECRET=seu_client_secret
IFOOD_MERCHANT_ID=seu_merchant_id
```

---

## Conectividade Frontend ↔ API

O frontend (`ops-web`) determina automaticamente a URL da API:

```js
// Produção: camoburguer-ops-web → camoburguer-api
const apiBase = hostname.replace('ops-web', 'api');

// Local: http://localhost:3001
```

> **Importante**: O naming convention dos serviços no `render.yaml` deve manter o padrão `camoburguer-ops-web` / `camoburguer-api` para que a detecção automática funcione.

---

## Segurança

### Headers (Static Site)

```yaml
headers:
  - path: /*
    name: X-Frame-Options
    value: DENY
```

### API

- **Helmet**: Headers de segurança em todas as respostas
- **Rate Limit**: 1000 req/min (configurável)
- **CORS**: `origin: true` (aceita qualquer origem)
- **Logs sanitizados**: Tokens de integração nunca vazam nos logs

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|---|---|---|
| "Failed to fetch" no frontend | Cache do JS antigo | `Ctrl+Shift+R` para forçar reload |
| "Not Found" em `/catalog` | apiBase apontando para ops-web | Verificar se deploy do ops-web está atualizado |
| API retorna 404 na raiz | Versão antiga sem health check | Fazer deploy do commit mais recente |
| Banco vazio após deploy | AUTO_SEED desabilitado | Verificar variável ou rodar seed manualmente |
| CORS bloqueado | Plugin não registrado | Verificar `@fastify/cors` no server.js |

### Verificação Manual

```bash
# Testar API diretamente
curl https://camoburguer-api.onrender.com/health
curl https://camoburguer-api.onrender.com/catalog

# Testar no console do navegador
fetch('https://camoburguer-api.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Rollback

- **Migrações aditivas**: Reverter para commit anterior sem perder dados
- **Manual Deploy**: No Render → Service → Manual Deploy → selecionar commit
- **Banco preservado**: Schema só adiciona; nunca remove colunas ou tabelas

---
*Para mais detalhes da arquitetura técnica, consulte a [Documentação Central](DOCUMENTACAO_CENTRAL.md).*
