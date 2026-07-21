# 🍔 Camoburguer Demo

> **O coração digital da sua hamburgueria: ágil, resiliente, auditável e pronto para a nuvem.**

O **Camoburguer** é uma plataforma operacional de alta performance desenhada para centralizar pedidos, eliminar a confusão na cozinha e oferecer total visibilidade financeira ao seu negócio. Seja no atendimento de balcão, via WhatsApp, com comanda local em mesas ou integrado a aplicativos de delivery (iFood e Delivery Much), sua equipe trabalha em um fluxo unificado e contínuo.

---

## 🚀 Destaques da Plataforma

- **Fila Unificada de Atendimento**: Centralize Balcão, WhatsApp, iFood e OlaClick em uma única fila de autorização visual.
- **Fluxo Contínuo de Comandas e Mesas**: Lançamento de rodadas direto na aba de comandas com carrinho e catálogo integrados.
- **Desconto Flexível por Item e Rodada**: Aplicação de descontos percentuais por produto e por rodada diretamente na comanda/mesa aberta.
- **Estoque Transacional Append-Only**: Baixa automática em transação atômica no banco relacional. Impede vendas sem saldo e restitui itens em cancelamentos elegíveis.
- **Cozinha Sem Papel Perdido**: Ticket impresso em padrão térmico claro (client-side via `window.print()` e bridge de spooler). Tickets corretivos em cancelamentos parciais sem apagar o histórico original.
- **Caixa Gerencial Blindado**: Controle de turnos (Abertura, Reforço, Sangria e Fechamento), histórico imutável de recebimentos por múltiplos métodos (Dinheiro, Pix, Crédito, Débito, App).
- **Pronto para Nuvem (Render PaaS)**: Deploy em 1 clique via arquivo Blueprint `render.yaml` (PostgreSQL, Fastify API, Print Bridge e Ops Web CDN).

---

## ⚙️ Testando no Ambiente Local (Modo Demo)

O ambiente de demonstração sobe a pilha completa via Docker Compose com um único comando:

```bash
docker compose up -d --build
```

### Script de Carga de Demonstração (Seed):
Para popular o banco PostgreSQL local com comandas, mesas, vendas e histórico de teste:
```bash
node scripts/seed-demo.mjs
```

### URLs de Acesso Local:
- 🖥️ **Painel Operacional (Ops Web)**: [http://localhost:8081](http://localhost:8081)
- ⚙️ **API Core (Fastify)**: [http://localhost:3001/health](http://localhost:3001/health)
- 🖨️ **Serviço de Impressão (Print Bridge)**: [http://localhost:3100/health](http://localhost:3100/health)

---

## 🧪 Bateria de Testes e Fumaça (End-to-End)

```bash
# Testes Unitários de Domínio, Financeiro e UI (30 testes)
npm test

# Teste de Fumaça Integrado End-to-End
npm run smoke
```

---

## 🌐 Deploy em Nuvem (Render Server PaaS)

O Camoburguer inclui o Blueprint `render.yaml` para deploy automatizado na plataforma **Render**.

1. Crie uma conta no [Render](https://render.com/).
2. Conecte seu repositório do GitHub em **Blueprints** > **New Blueprint Instance**.
3. O Render provisionará automaticamente o banco PostgreSQL, a API Fastify, a Print Bridge e o Ops Web Static.

> 📖 **Guia Completo de Deploy**: Consulte o arquivo [docs/RENDER_DEPLOY.md](docs/RENDER_DEPLOY.md).

---

## 📚 Documentação Técnica Completa

Toda a arquitetura, regras de negócio e histórico de decisões foram unificados em nosso guia mestre:

- 📑 **[Documentação Central Unificada](docs/DOCUMENTACAO_CENTRAL.md)**
- 🚀 **[Guia de Deploy no Render](docs/RENDER_DEPLOY.md)**
- 🏗️ **[Arquitetura do Sistema](docs/arquitetura-do-sistema.md)**
- 🔄 **[Ciclo do Pedido](docs/ciclo-do-pedido.md)**
- 💰 **[Ciclo Financeiro](docs/ciclo-financeiro.md)**
- 📦 **[Controle de Estoque](docs/estoque.md)**
- 🖨️ **[Padrão do Ticket de Cozinha](docs/padrao-ticket-cozinha.md)**

---
*Camoburguer: A essência da operação gastronômica moderna.*
