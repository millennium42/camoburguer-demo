# 🚀 Guia de Deploy no Render (Servidor & Blueprint)

> **Instruções passo a passo para colocar a demonstração do Camoburguer no ar na nuvem (PaaS Render).**

---

## 📋 Arquitetura de Deploy no Render

O **Camoburguer** foi projetado para ser implantado na nuvem de forma automatizada e segura, utilizando o recurso de **Blueprints (`render.yaml`)** da plataforma [Render](https://render.com/).

```
                               ┌─────────────────────────┐
                               │   GITHUB REPOSITÓRIO    │
                               │   (render.yaml)         │
                               └────────────┬────────────┘
                                            │ 1-Click Blueprint
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
                                   │ Single-Page App │
                                   └─────────────────┘
```

A infraestrutura completa provisionada consiste em:
1. **`camoburguer-db`** (*PostgreSQL*): Banco de dados relacional gerenciado.
2. **`camoburguer-api`** (*Web Service Node.js*): Núcleo da API Fastify contendo regras de domínio e persistência.
3. **`camoburguer-bridge`** (*Web Service Node.js*): Serviço de impressão e spooler de tickets.
4. **`camoburguer-ops-web`** (*Static Site*): Interface do operador hospedada em CDN com proteção `X-Frame-Options: DENY`.

---

## ⚙️ 1. Variáveis de Ambiente e Configuração

Toda a configuração sensível é carregada estritamente através das variáveis de ambiente gerenciadas no Render. **Nenhum segredo ou chave privada deve ser commitado no código.**

### Tabela de Variáveis do Web Service (`camoburguer-api`):

| Variável | Origem | Descrição | Exemplo |
| --- | --- | --- | --- |
| `DATABASE_URL` | Automático (Blueprint) | String de conexão com o banco PostgreSQL | `postgres://user:pass@host/db` |
| `PORT` | Predefinido | Porta de escuta da API Fastify | `3001` |
| `NODE_ENV` | Predefinido | Ambiente de execução | `production` |
| `PRINT_BRIDGE_URL` | Predefinido | URL pública do Web Service do Print Bridge | `https://camoburguer-bridge.onrender.com` |
| `DEFAULT_PRINTER` | Predefinido | Identificador da impressora padrão | `cozinha-principal` |

### Integrações Opcionais (Delivery Much & iFood):

Caso deseje ativar os conectores de marketplace no Render, cadastre as seguintes chaves no Web Service da API:

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

## 🛠️ 2. Executando o Deploy com Render Blueprint (1-Click)

O repositório já inclui o arquivo `render.yaml` pronto na raiz.

### Passo a Passo:

1. **Crie uma conta gratuita no Render**: Acesse [https://render.com/](https://render.com/).
2. **Conecte sua conta do GitHub**: No menu de perfil, autorize a integração com sua conta do GitHub.
3. **Inicie o Blueprint**:
   - No Dashboard do Render, clique no botão **New +** e selecione **Blueprint**.
   - Conecte o repositório `camoburguer-demo`.
4. **Confirme o Blueprint**:
   - Defina o nome do grupo de serviços (ex: `camoburguer-demo-server`).
   - O Render identificará os 4 serviços declarados no `render.yaml`.
   - Clique em **Apply**.
5. **Acompanhe o Build**:
   - O Render iniciará a criação do banco de dados PostgreSQL e a compilação dos Web Services.
   - Em cerca de 2 a 3 minutos, todos os serviços estarão com status **Live**.

---

## 🗄️ 3. Inicialização e Carga de Dados (Seed Demo)

O Camoburguer utiliza **migrações automáticas aditivas** (`schemaSql`). Quando a API `camoburguer-api` é iniciada, o schema do PostgreSQL é instanciado automaticamente.

### Como popular o banco com dados de demonstração no Render:

Caso deseje carregar comandas, mesas, vendas e histórico inicial no Render, você pode rodar o script `seed-demo.mjs` de qualquer máquina local apontando para a `DATABASE_URL` do Render:

```bash
DATABASE_URL="postgres://camoburguer_user:SUA_SENHA@dpg-xxx.render.com/camoburguer" node scripts/seed-demo.mjs
```

---

## 🔒 4. Cabeçalhos de Segurança (Security Headers)

A interface operacional (`camoburguer-ops-web`) é configurada no `render.yaml` com o cabeçalho de proteção contra ataque de enquadramento:

```yaml
headers:
  - path: /*
    name: X-Frame-Options
    value: DENY
```

Isso garante que a SPA de caixa não possa ser incorporada dentro de `<iframe>` maliciosos em sites terceiros.

---

## 🔍 5. Verificação e Troubleshooting

- **Logs Sanitizados**: Toda requisição e resposta do cliente de integração de delivery sanitiza cabeçalhos `Authorization` e `Bearer`. Tokens de integração nunca vazam nos logs da plataforma.
- **Rollbacks Sem Perda de Dados**: As migrações do Camoburguer são estritamente aditivas. Caso precise fazer o rollback para um commit anterior no Render, o banco de dados permanecerá 100% íntegro.

---
*Para mais detalhes da arquitetura técnica completa, consulte a [Documentação Central Unificada](DOCUMENTACAO_CENTRAL.md).*
