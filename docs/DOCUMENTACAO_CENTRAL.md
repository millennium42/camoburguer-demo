# 📚 Camoburguer Demo — Documentação Central Unificada

> **O coração operacional da sua hamburgueria: ágil, resiliente, auditável e feito para nuvem.**

---

## 📋 Sumário Executivo

1. [Visão Geral e Contexto Operacional](#1-visão-geral-e-contexto-operacional)
2. [Arquitetura do Sistema e Ecossistema de Aplicações](#2-arquitetura-do-sistema-e-ecossistema-de-aplicações)
3. [Ciclo do Pedido e Máquina de Estados](#3-ciclo-do-pedido-e-máquina-de-estados)
4. [Gestão de Comandas, Mesas e Pagamentos Múltiplos](#4-gestão-de-comandas-mesas-e-pagamentos-múltiplos)
5. [Controle de Estoque Transacional Append-Only](#5-controle-de-estoque-transacional-append-only)
6. [Ciclo Financeiro Gerencial e Operação de Caixa](#6-ciclo-financeiro-gerencial-e-operação-de-caixa)
7. [Canais de Atendimento e Integrações de Delivery](#7-canais-de-atendimento-e-integrações-de-delivery)
8. [Automações Operacionais e Proteções por Cenário](#8-automações-operacionais-e-proteções-por-cenário)
9. [Padrão de Impressão e Tickets da Cozinha](#9-padrão-de-impressão-e-tickets-da-cozinha)
10. [Guia de Desenvolvimento e Protocolo Git/Graphify](#10-guia-de-desenvolvimento-e-protocolo-gitgraphify)
11. [Guia Detalhado de Deploy em Nuvem (Render Server & Blueprint)](#11-guia-detalhado-de-deploy-em-nuvem-render-server--blueprint)
12. [Histórico Decisório 5W2H e Evolução](#12-histórico-decisório-5w2h-e-evolução)

---

## 1. Visão Geral e Contexto Operacional

O **Camoburguer** é uma plataforma integrada de gestão gastronômica focada em operações de alto volume (hamburguerias, lancherias e dark kitchens). Desenvolvida sob a doutrina **Ponytail Full** (a menor solução técnica correta com o mínimo de peças móveis), a plataforma resolve a complexidade operacional da hamburgueria através de um **núcleo operacional único para pedidos**.

```
                        ┌─────────────────────────────────────────┐
                        │         FONTES DE PEDIDO                │
                        │  Balcão · WhatsApp · iFood · OlaClick   │
                        └────────────────────┬────────────────────┘
                                             │
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │      NÚCLEO ÚNICO DO CAMOBURGUER        │
                        │   API Fastify + Domínio Transacional    │
                        └────────┬──────────────────────┬─────────┘
                                 │                      │
                                 ▼                      ▼
                    ┌────────────────────────┐  ┌────────────────────────┐
                    │    PAINEL OPERADOR     │  │   FILA DA COZINHA      │
                    │  Comandas & Financeiro │  │   Impressão Client-Side│
                    └────────────────────────┘  └────────────────────────┘
```

### Principais Invariantes Operacionais:
- **Sem "Tablets Apitando"**: Centralização de todos os canais em uma única fila visual de atendimento.
- **Padrão Posto Único (v1)**: A interface é desenhada para posto operacional único, sem login, autenticação burocrática ou papéis administrativos expostos.
- **Operação sem Papel Perdido**: Transação atômica que grava o pedido, abate o estoque e gera a impressão para a cozinha na mesma execução.
- **Idempotência Nativa**: Proteção total contra duplo clique, queda de conexão ou reenvios em todas as APIs.

---

## 2. Arquitetura do Sistema e Ecossistema de Aplicações

O repositório é organizado como um monorepo Node.js limpo utilizando workspaces nativos.

### Estrutura de Diretórios:

```
camoburguer-demo/
├── apps/
│   ├── api/              # API Core HTTP (Fastify), rotas, banco, SSE e integrações
│   ├── ops-web/          # Interface SPA leve em HTML5/Vanilla JS/CSS
│   ├── print-bridge/     # Serviço local/nuvem de spooler e bridge de impressão
│   └── event-simulator/  # Utilitário para simulação de eventos e carga demo
├── packages/
│   ├── domain/           # Entidades puras de negócio, regras de catálogo e totais
│   ├── finance-core/     # Lançamentos gerenciais, agregação de caixa e relatórios
│   └── shared-types/     # Enums, contratos de API e interfaces compartilhadas
├── docs/                 # Documentação técnica unificada e guias
├── scripts/              # Scripts de seed-demo, simulação e utilitários WSL
├── tests/                # Testes unitários e testes de fumaça (smoke end-to-end)
└── render.yaml           # Blueprint de infraestrutura como código para Render PaaS
```

### Diagrama Transacional Unificado (Mermaid):

```mermaid
flowchart TD
    subgraph CAPTURA["Captura e Canais"]
        A1["Balcão / Counter"]
        A2["WhatsApp"]
        A3["iFood (Fila Aceite)"]
        A4["OlaClick"]
    end

    subgraph API_CORE["API Core & Domínio"]
        B1["POST /orders ou /tabs/:id/rounds"]
        B2["Validação Idempotente & Lock"]
        B3["Domínio: Preços, Descontos & Adicionais"]
        B4["DB Transaction (pg)"]
    end

    subgraph PERSISTENCE["Persistência PostgreSQL"]
        C1[("orders / service_tabs")]
        C2[("stock_balances / stock_movements")]
        C3[("tab_payments / finance_entries")]
        C4[("print_jobs")]
    end

    subgraph SAIDA["Saída Operacional"]
        D1["SSE Realtime Hub"]
        D2["Cozinha (Fila & Ticket HTML/Print)"]
        D3["Financeiro Gerencial & Caixa"]
    end

    A1 & A2 & A3 & A4 --> B1
    B1 --> B2 --> B3 --> B4
    B4 --> C1 & C2 & C3 & C4
    C1 & C4 --> D1 & D2
    C3 --> D3
```

---

## 3. Ciclo do Pedido e Máquina de Estados

Todo pedido no Camoburguer transita por uma máquina de estados estrita.

### Fluxo de Estados:

```
[received] ──(Aceite)──> [confirmed] ──(Preparo)──> [in_preparation] ──(Pronto)──> [ready] ──(Concluir)──> [completed]
    │                        │                               │                      │
    └──(Recusar)─────────────┴──────(Cancelar Rodada)────────┴──────────────────────┴───(Cancelar)───> [cancelled]
```

- **`received`**: Pedido capturado de canais externos (ex: iFood), aguardando aprovação na Fila de Autorização. Não reserva estoque nem imprime ticket.
- **`confirmed`**: Pedido confirmado (ou rodada enviada de comanda local). O estoque é baixado e o ticket enviado à cozinha na mesma transação.
- **`in_preparation`**: Pedido em produção na cozinha.
- **`ready`**: Pedido pronto para entrega ou servir na mesa.
- **`completed`**: Pedido entregue e concluído. Gera o lançamento financeiro automático se não for rodada de comanda.
- **`cancelled`**: Pedido cancelado. Se cancelado antes do preparo (`in_preparation`), restitui o estoque automaticamente.

### Regra de Cálculo de Totais e Descontos:
1. **Desconto da Linha**: Aplicado em cada item individualmente (`price * qty * (1 - itemDiscount/100)`).
2. **Adicionais**: Somados ao valor base de cada item antes do desconto da linha.
3. **Desconto Geral**: Aplicado sobre o subtotal resultante (`subtotal * (1 - orderDiscount/100)`).
4. **Validação**: Percentuais permitidos estritamente entre `0` e `100`.

---

## 4. Gestão de Comandas, Mesas e Pagamentos Múltiplos

Comandas e mesas (`service_tabs`) representam o consumo local acumulado.

### Regras Comerciais das Comandas:
- **Rodadas Independentes**: Cada adição de itens gera um novo pedido em `orders` com `tab_id`, número de rodada sequencial e ticket próprio na cozinha.
- **Forma de Pagamento Desacoplada**: A rodada não carrega forma de pagamento. O cliente consome ao longo da permanência e efetua parcelas de pagamento independentes.
- **Pagamentos Parciais**: `POST /tabs/:tabId/payments` aceita pagamentos fracionados (Dinheiro, Pix, Cartão de Crédito, Cartão de Débito, Pago no App).
- **Validação de Centavos**: Saldo mantido em centavos inteiros (`balanceCents`). Parcelas que excedem o saldo restante são rejeitadas com HTTP `409 Conflict`.
- **Estorno Append-Only**: O endpoint `POST /tabs/:tabId/payments/:paymentId/reversals` gera uma parcela compensatória reativa. O histórico original nunca é apagado.
- **Encerramento Seguro**: `POST /tabs/:tabId/close` exige saldo zerado (`balanceCents === 0`). Todas as rodadas abertas são finalizadas como `completed`.

---

## 5. Controle de Estoque Transacional Append-Only

O estoque controla unidades prontas para venda em 3 categorias centrais: **`xis`**, **`dog`** e **`hamburguer`**.

```
                          ┌───────────────────────────┐
                          │     ESTOQUE INICIAL       │
                          │   (Inserção Auditada)     │
                          └─────────────┬─────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              ┌─────────────────────┐       ┌────────────────────┐
              │    VENDA / RODADA   │       │   AJUSTE MANUAL    │
              │  Baixa Transacional │       │ Reforço / Perda    │
              └──────────┬──────────┘       └────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    CANCELAMENTO     │
              │ Restituição (antes  │
              │    do preparo)      │
              └─────────────────────┘
```

- **Lock e Consistência**: Ao enviar um pedido com itens estocáveis, a API bloqueia as linhas da tabela `stock_balances` em ordem alfabética de categoria para prevenir *deadlocks*.
- **Sem Saldo Negativo**: Se o saldo atual for inferior à quantidade solicitada, a transação inteira é abortada com HTTP `409` (sem baixa parcial nem geração de pedido).
- **Restituição Inteligente**: O cancelamento só devolve o estoque se a rodada ainda não tiver entrado em `in_preparation`.

---

## 6. Ciclo Financeiro Gerencial e Operação de Caixa

O sistema mantém um livro caixa gerencial imutável (`finance_entries`).

### Regras do Caixa (`cash_shifts`):
- **Estados de Turno**: O caixa possui estados `open` e `closed`.
- **Abertura e Fechamento**: O turno registra o valor inicial esperado, reforços, retiradas (sangrias), numerário contado no fechamento e a diferença apurada (`difference_amount`).
- **Movimentações (`Adicionar movimentação`)**:
  - **Reforço**: Entradas de numerário no gaveteiro.
  - **Retirada (sangria)**: Retirada de numerário com o tipo canônico `cash_withdrawal`. Reduz o caixa esperado do turno sem afetar o faturamento comercial.
- **Vínculo por Método**: Apenas recebimentos em **Dinheiro (`cash`)** alteram o numerário físico esperado no caixa. Pix, Cartões e Apps compõem o Faturamento Bruto.

---

## 7. Canais de Atendimento e Integrações de Delivery

O Camoburguer normaliza 4 fontes de captura de pedidos:

| Canal | Tipo de Captura | Regra de Atendimento | Exige Endereço? |
| --- | --- | --- | --- |
| `counter` | Operador / Balcão | `local` / `pickup` / `delivery` | Sim, se `delivery` |
| `whatsapp` | Lançamento manual | `delivery` / `pickup` | Sim, se `delivery` |
| `ifood` | Webhook / Polling | Fila de Autorização (`received`) | Conforme payload |
| `olaclick` | Captura integrada | Fila de Autorização (`received`) | Conforme payload |

---

## 8. Automações Operacionais e Proteções por Cenário

| Evento | Condição | Ação Automática | Proteção de Segurança |
| --- | --- | --- | --- |
| **Envio de Rodada** | Saldo em estoque OK | Baixa estoque, grava pedido e emite ticket | Transação atômica DB |
| **Envio sem Estoque** | Categoria com saldo insuficiente | Cancela envio com HTTP 409 | Rollback completo |
| **Cancelamento Pré-Preparo** | Status `< in_preparation` | Restitui unidades e gera ticket corretivo | Idempotência e lock |
| **Pagamento de Comanda** | Turno aberto & Saldo OK | Registra parcela e atualiza saldo | Bloqueio de overpayment |
| **Sangria / Retirada** | Turno de caixa aberto | Grava `cash_withdrawal` | Vínculo estrito ao turno |

---

## 9. Padrão de Impressão e Tickets da Cozinha

A impressão é realizada via interface client-side HTML5 com suporte nativo `window.print()` e backup via `print-bridge`.

### Ticket Padrão de Produção:
```
========================================
       CAMOBURGUER - COZINHA
========================================
PEDIDO: #e4f91a   -  Mesa 04 (Rodada 2)
HORA: 21/07/2026, 02:15
CANAL: Balcão | MODO: Local
CLIENTE: João Silva
----------------------------------------
QTD  ITEM / ADICIONAIS / OBS
----------------------------------------
 2x  X-BURGER
     + Ovo
     + Bacon
     Obs: Ponto ao ponto para mal passado
 1x  BATATA FRITA (G)
----------------------------------------
TICKET EMITIDO VIA CAMOBURGUER CORE
========================================
```

### Ticket Corretivo (Cancelamento):
```
========================================
   *** CANCELAMENTO / RETIRAR ***
========================================
PEDIDO REF: #e4f91a  -  Mesa 04 (Rodada 3)
HORA: 21/07/2026, 02:20
----------------------------------------
RETIRAR DA PRODUÇÃO:
 - 1x X-BURGER
 MOTIVO: Cliente alterou o pedido
========================================
```

---

## 10. Guia de Desenvolvimento e Protocolo Git/Graphify

Para manter a saúde do repositório, o desenvolvimento segue um fluxo rigoroso:

### 1. Suíte de Testes Locais:
```bash
npm test
```
Executa a bateria de 30 testes unitários de domínio, financeiro e interface.

### 2. Validação End-to-End (Smoke Test):
```bash
npm run smoke
```
Simula a operação completa: abertura de turno, criação de pedidos em múltiplos canais, parcelamento de comanda, sangria, estorno e fechamento de caixa.

### 3. Protocolo Git:
- **Commits Coesos**: Toda alteração de código ou documentação deve ser acompanhada de commit e testes.
- **Padrão de Mensagens**: `feat(...)`, `fix(...)`, `docs(...)`, `refactor(...)`.

---

## 11. Guia Detalhado de Deploy em Nuvem (Render Server & Blueprint)

Oecossistema do Camoburguer está 100% preparado para implantação em nuvem via PaaS **Render** utilizando o arquivo **`render.yaml` (Render Blueprint)** presente na raiz do projeto.

### Componentes no Render:
1. **`camoburguer-db`** (*PostgreSQL*): Instância gerenciada do banco relacional.
2. **`camoburguer-api`** (*Web Service Node.js*): Núcleo da API Fastify.
3. **`camoburguer-bridge`** (*Web Service Node.js*): Serviço de impressão e spooler.
4. **`camoburguer-ops-web`** (*Static Site*): Interface do operador hospedada em CDN de alta velocidade com cabeçalhos de segurança ativados (`X-Frame-Options: DENY`).

---

### Passo a Passo de Implantação no Render:

#### Passo 1: Preparar o Repositório no GitHub
Garanta que seu repositório contém as alterações mais recentes com o arquivo `render.yaml` na raiz.

#### Passo 2: Criar Conta e Conectar GitHub no Render
1. Acesse [https://render.com/](https://render.com/) e faça login.
2. No dashboard principal, vá em **Blueprints** > **New Blueprint Instance**.
3. Conecte sua conta do GitHub e selecione o repositório **`camoburguer-demo`**.

#### Passo 3: Configurar Nome da Instância e Aplicar
1. Defina um nome para a instância do Service Group (ex: `camoburguer-prod`).
2. O Render lerá o arquivo `render.yaml` e exibirá os 4 recursos a serem provisionados.
3. Clique em **Apply**.

```
                        ┌────────────────────────────────────────┐
                        │      RENDER BLUEPRINT (render.yaml)    │
                        └──────────────────┬─────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴───────┬──────────────────┐
         ▼                  ▼                      ▼                  ▼
┌──────────────────┐┌───────────────┐  ┌──────────────────┐┌──────────────────┐
│ PostgreSQL DB    ││ Fastify API   │  │ Print Bridge     ││ Ops Web          │
│ camoburguer-db   ││ camoburguer-  │  │ camoburguer-     ││ camoburguer-     │
│ (Gerenciado)     ││ api           │  │ bridge           ││ ops-web (Static) │
└──────────────────┘└───────────────┘  └──────────────────┘└──────────────────┘
```

#### Passo 4: Migração Automática e Seed
- **Schema Automático**: A API Fastify executa o `schemaSql` idempotente no boot. O banco é estruturado automaticamente na primeira inicialização.
- **Seeding de Demonstração (Opcional)**: Para popular o ambiente de demonstração no Render, execute o script via console ou terminal:
  ```bash
  DATABASE_URL="<Sua_DATABASE_URL_do_Render>" node scripts/seed-demo.mjs
  ```

---

### Variáveis de Ambiente no Render (Environment Variables):

| Variável | Serviço | Descrição | Exemplo / Valor Default |
| --- | --- | --- | --- |
| `DATABASE_URL` | `camoburguer-api` | Preenchido automaticamente pelo Render | `postgres://user:pass@host/db` |
| `PORT` | `camoburguer-api` | Porta de escuta da API Fastify | `3001` |
| `NODE_ENV` | `camoburguer-api` | Modo de execução | `production` |
| `PRINT_BRIDGE_URL` | `camoburguer-api` | URL da Bridge de Impressão | `https://camoburguer-bridge.onrender.com` |
| `DEFAULT_PRINTER` | `camoburguer-api` | Identificador da impressora principal | `cozinha-principal` |

---

## 12. Histórico Decisório 5W2H e Evolução

A evolução do Camoburguer é rastreada através da metodologia **5W2H**:

| PR | O quê (What) | Por quê (Why) | Onde (Where) | Como (How) |
| --- | --- | --- | --- | --- |
| **PR 0** | Descontos por item e no total | Permitir descontos de 0-100% sem alterar catálogo base | Domínio, DB `orders`, UI | Cálculo acumulado e trava no domínio |
| **PR 1** | Guia e automação Graphify | Tornar evoluções reproduzíveis com validação WSL | Docs, scripts npm | Execução do Graphify via Ubuntu/WSL |
| **PR 2** | Cardápio OlaClick | Atualizar o cardápio com preços reais capturados | Pacote de domínio, `/catalog` | Snapshot estático com 51 produtos |
| **PR 3** | Adicionais do Cardápio | Permitir opcionais pagos por categoria | Catálogo, carrinho, ticket | Checkboxes nativos e SKUs congelados |
| **PR 4** | Comandas e Mesas | Atender consumo local em rodadas | `service_tabs`, UI Comandas | Rodadas sequenciais vinculadas |
| **PR 5** | Tickets Corretivos | Permitir cancelamentos parciais sem apagar o histórico | Endpoint cancellation, UI | Inserção de rodada negativa |
| **PR 6** | Estoque por Categoria | Baixa e restituição de Xis, Dog e Hambúrguer | `stock_balances`, DB | Lock por ordem alfabética de categoria |
| **PR 7** | Pagamentos Múltiplos | Aceitar parcelas fracionadas e estornos em comandas | `tab_payments`, UI | Validação de centavos e `mixed` derivado |
| **PR 8** | Retiradas e Filtros | Registrar sangria e sincronizar visões gerenciais | Painel financeiro, API | Reutilização do tipo `cash_withdrawal` |
| **PR 9** | QA e Ajustes Responsivos | Garantir operabilidade em telas touch estreitas (390px) | CSS `ops-web`, suíte | Flex-wrap e prevenção de overflow |
| **PR 10** | Integrações iFood / Delivery Much | Isolamento de pedidos externos em Fila de Autorização | `channel_mappings`, API | Status `received` antes da aprovação |
| **PR 11** | Redesign Visual Dark | Prover estética de alta performance para caixa | `styles.css` | Cores Tailored, glassmorphism |
| **PR 12** | Impressão Client-Side | Permitir demonstração tátil via `window.print()` | `main.js`, `index.html` | Injeção em área de impressão isolada |
| **PR 13** | Documentação Central & Render Deploy | Unificar documentação e prover Blueprint de deploy em nuvem | `docs/`, `render.yaml`, `README.md` | Guia completo + `render.yaml` nativo |

---
*Camoburguer: Engenharia de ponta para a gastronomia moderna.*
