# Guia de Deploy no Render

O ecossistema do **Camoburguer** foi desenhado para ser implantado na nuvem de forma prática e segura, utilizando o **Render** como plataforma de PaaS, por meio do uso de **Blueprints (`render.yaml`)**.

Nossa arquitetura básica de deploy possui:
1. Um banco de dados **PostgreSQL** gerenciado.
2. Um Web Service para a **API Node.js** (Fastify).
3. Um Web Service para a **Bridge de Impressão** (Fastify).
4. Um Static Site para o **Ops Web** (Frontend nativo).

---

## 1. Variáveis de Ambiente e Segurança

**NUNCA adicione segredos, senhas ou chaves de integração diretamente no código (arquivos do GitHub).**
Toda configuração de ambiente é carregada estritamente pelas variáveis do Render.

As seguintes variáveis devem ser cadastradas na interface do Render (no nível do Environment Group ou diretamente no Web Service da API):

### Variáveis Core
- `DATABASE_URL`: Gerada automaticamente pelo banco PostgreSQL provisionado.
- `PRINT_BRIDGE_URL`: A URL final do Web Service da Bridge de Impressão (ex: `https://camo-bridge.onrender.com`).
- `DEFAULT_PRINTER`: O nome da impressora física principal mapeada (ex: `cozinha-principal`).

### Integrações — Delivery Much
- `DELIVERYMUCH_ENABLED`: `true` ou `false`
- `DELIVERYMUCH_AUTH_URL`: URL de autenticação da plataforma
- `DELIVERYMUCH_API_URL`: URL base da API
- `DELIVERYMUCH_CLIENT_ID`: (Segredo) ID do Cliente
- `DELIVERYMUCH_CLIENT_SECRET`: (Segredo) Senha do Cliente
- `DELIVERYMUCH_USERNAME`: (Segredo) Usuário da loja
- `DELIVERYMUCH_PASSWORD`: (Segredo) Senha da loja
- `DELIVERYMUCH_COMPANY_UUID`: UUID fornecido pela DM

### Integrações — iFood
- `IFOOD_ENABLED`: `true` ou `false`
- `IFOOD_API_URL`: URL base (ex: `https://merchant-api.ifood.com.br`)
- `IFOOD_CLIENT_ID`: (Segredo) ID fornecido no Portal do Parceiro
- `IFOOD_CLIENT_SECRET`: (Segredo) Secret
- `IFOOD_MERCHANT_ID`: ID interno da loja

---

## 2. Preparando o Banco de Dados (PostgreSQL)

O Camoburguer possui migrações **aditivas automáticas**. Não é necessário rodar ferramentas externas de migração.
Assim que a API subir pela primeira vez com a conexão correta do `DATABASE_URL`, o schema será instanciado ou atualizado sem perda de dados.

O Blueprint cria uma instância `Free` de PostgreSQL, ideal para testes de carga e demonstrações comerciais.

---

## 3. Realizando o Deploy (Render Blueprint)

Para efetuar o deploy com um único clique no Render, um arquivo `render.yaml` será inserido na raiz do projeto contendo a estrutura base.

### Passos:
1. Crie uma conta no [Render](https://render.com/).
2. Conecte sua conta do GitHub.
3. No painel do Render, vá em **Blueprints** > **New Blueprint Instance**.
4. Selecione o repositório do `camoburguer`.
5. Preencha as variáveis secretas solicitadas no prompt visual da plataforma.
6. Clique em **Apply**.

A plataforma criará automaticamente o banco, e as 3 aplicações (API, Bridge e Ops Web).

---

## 4. Segurança do Frontend (Headers)

Para garantir segurança na interface exposta (`ops-web`), o Blueprint configura nativamente a injeção do cabeçalho `X-Frame-Options: DENY`, prevenindo ataques de *Clickjacking*. Não exponha APIs externas nem tokens nos arquivos de JavaScript, toda regra reside apenas no back-end.

---

## 5. Manutenção e Troubleshooting

- **Logs Seguros**: O módulo de HTTP Client da nossa aplicação sanitiza automaticamente cabeçalhos que possuem *Bearer tokens*. Se ocorrer um erro nas integrações de delivery, as chaves não vazarão nos Logs do Render.
- **Rollback**: Caso alguma release suba com instabilidades sistêmicas críticas, use a funcionalidade de *Deploy specific commit* do próprio dashboard do Render. Todas as migrações de banco no código foram desenhadas para não destruir dados novos no caso de downgrade da API.
