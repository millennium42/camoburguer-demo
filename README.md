# Camoburguer Demo

> Sistema de operação para pedidos, cozinha, caixa e integrações externas de um
> restaurante de pequeno porte.

## Pré-requisitos

- Node.js 22+
- npm
- Git
- Docker Desktop com integração WSL (se usar Windows)
- PostgreSQL 16 (via Compose)

## Setup técnico

Siga os passos numerados para configurar o ambiente de desenvolvimento local:

1. **Clonar e instalar**
   ```bash
   git clone <repo-url> camoburguer-demo
   cd camoburguer-demo
   npm ci
   ```

2. **Configurar variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Preencha ADMIN_BOOTSTRAP_PASSWORD e PRINT_BRIDGE_TOKEN
   ```

3. **Subir infraestrutura e testar o núcleo**
   ```bash
   docker compose up -d db
   npm run check
   npm test
   npm run test:db
   ```

4. **Subir serviços completos**
   ```bash
   docker compose up -d
   ```

5. **Validar a operação (Smoke E2E)**
   ```bash
   npm run seed:demo --confirm-target=127.0.0.1:5432/camoburguer
   npm run smoke
   ```

## Problemas comuns (Troubleshooting)

| Sintoma | Causa provável | Ação de correção |
|---|---|---|
| `[FATAL] Detectados múltiplos caixas abertos` | Erro transacional ou instâncias paralelas | Seguir o [Runbook de Duplicatas](docs/operacao/runbook-duplicatas.md) |
| `UND_ERR_SOCKET` no smoke | API/Containers ainda subindo | Aguardar 15 segundos após o `compose up -d` |
| Seed recusa criação (`409` ou `503`) | Banco já tem estado operacional ou alvo divergente | Zerar o banco com `compose down -v db` (se em dev) e garantir o `--confirm-target` exato |

## Documentação

Todo o conhecimento de domínio está mapeado em arquivos independentes dentro da pasta `docs/`.

| Arquivo | Conteúdo principal |
|---|---|
| [00-mapa-do-projeto.md](00-mapa-do-projeto.md) | **Ponto de entrada.** Índice completo e fluxo operacional. |
| [contexto-operacional.md](docs/contexto-operacional.md) | Atores, responsabilidades e limites da demo. |
| [arquitetura-do-sistema.md](docs/arquitetura-do-sistema.md) | Módulos, tabelas, modelo de persistência e fronteiras. |
| [guia-de-desenvolvimento.md](docs/guia-de-desenvolvimento.md) | Contratos, regras e fluxo de entrega assistido por IA. |
| [ciclo-do-pedido.md](docs/ciclo-do-pedido.md) | Estados, regras e vinculação de comandas. |
| [ciclo-financeiro.md](docs/ciclo-financeiro.md) | Caixa, turnos e visões gerenciais. |

Para a lista completa de documentos, consulte o **[Mapa do Projeto](00-mapa-do-projeto.md)**.
