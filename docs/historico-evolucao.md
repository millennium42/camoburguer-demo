---
tags: [historico, auditoria]
---

# Histórico de Evolução — Camoburguer Demo

> Histórico de evolução — não editar; registra decisões passadas como tomadas.
> Em caso de conflito, a documentação de domínio no diretório raiz reflete
> o estado contratual presente.

---

# Guia de uso

## Histórico de evolução 5W2H

Linha do tempo das pull requests (PR 0 a 18) com registro gerencial simplificado.

| PR | Resumo |
|---|---|
| 0 | Setup inicial: Fastify, SQLite em memória, HTML básico |
| 1 | Testes vitais, estrutura e correção de CSS responsivo |
| 2 | Modelos de persistência, SQLite nativo e UI unificada |
| 3 | Tratamento financeiro, troco e visualização de caixa |
| 4 | Melhorias no gerenciamento e visualização de caixa |
| 5 | Migração de SQLite para PostgreSQL |
| 6 | Impressão térmica de tickets |
| 7 | Arquitetura de impressão revisada |
| 8 | Spooling seguro de tickets |
| 9 | Módulo de automação v1 e canais externos |
| 10 | Polling unificado e outbox de integração |
| 11 | Fluxo de comandas e consumo local |
| 12 | Integração de iFood e Delivery Much |
| 13 | Reorganização de UI e catálogos modulares |
| 14 | Tratamento de dados sensíveis (LGPD) e seed unificado |
| 15 | Fluxo comercial, descontos e taxas |
| 16 | Estoque transacional |
| 17 | Pagamentos múltiplos |
| 18 | Auditoria e QA final |

## Auditoria commit a commit (Julho 2026)

Revisão técnica executada durante a migração para a arquitetura v1 consolidada.

| Hash | Escopo | Avaliação |
|---|---|---|
| `f3191d3` | deploy | ✅ `AUTO_SEED=false` forçado no boot e fallback de porta Node. Aprovado: garante que deploy/restart no Render não limpe o banco. Rollback nunca deve reverter esse commit. |
| `7b14a6b` | ops | ✅ Documentação de build/deploy Blueprint. |
| `6b30f40` | deps | ✅ Remoção explícita de pacote não utilizado, mitigando falsos positivos na auditoria de CI. Aprovado: mantém a build enxuta e o SBOM menor. |
| `c62da76` | integracao | ✅ Fallbacks operacionais na visualização de integrações pendentes. Evita crash do DOM se o objeto mapeado estiver incompleto ou pendente de carga. Aprovado. |
| `e8a006c` | seguranca | ✅ Restrição de CORS via variável de ambiente, substituindo o wildcard. Validação rígida com log silencioso. Aprovado: encerra um gap de configuração em deploy real. |
| `f9e8a71` | infra | ✅ Script `seed-demo.mjs` autenticado (via `POST /auth/login` e `POST /demo/seed`) substituindo bypass interno no boot. Aprovado. |
| `b57a4ab` | auth | ✅ Implementação completa de `auth_sessions`, logout explícito e controle de revogação. Rota `/app/` servindo console legado e cookie compatível. Aprovado. |
| `8dca0c1` | seguranca | ✅ Blueprint atualizado passando variável dinâmica via referência interna do Render. Aprovado: token exposto foi mitigado. |
| `e45b8fb` | db | ✅ Banco `users` e login bootstrap para administrador criado. Rota `/auth/login` validando e emitindo sessão. Aprovado: transição essencial de anônimo para autenticado. |
| `6b44fde` | ci | ✅ Atualização do fluxo Playwright/E2E suportando ambiente autenticado. Aprovado. |
| `7ca1f18` | docs | ✅ Runbook completo de múltiplas sessões de caixa (duplicatas transacionais). Aprovado. |
| `30c253d` | frontend | ✅ Filtro unificado no backend aplicado no render da tabela e nos totais. Aprovado. |
| `9c9b581` | financeiro | ✅ Correção na totalização financeira, somando estornos à categoria de origem, não criando valores em dinheiro que distorceriam o apurado no fechamento de turno. Aprovado. |
| `ea74fdb` | caixa | ✅ Fechamento validando valores esperados de caixa contra parcelas em dinheiro. Aprovado. |
| `14f0bc0` | interface | ✅ Remediações menores de UI e overflow de adicionais no mobile (limite responsivo aplicado a grid e forms). Aprovado. |
| `2d54e19` | caixa | ✅ Transação de retirada de numerário, segregada como `withdrawal`, impactando expectativa, mas não receita bruta. Aprovado. |
| `677abf1` | pagamento | ✅ Rota completa de múltiplos pagamentos (`/payments`), lock da linha da comanda, verificação de centavos excedentes, transação única e gravação de entrada no financeiro. Aprovado. |
| `b99e71e` | docs | ✅ Relatório de QA e Graphify local executado e publicado. Aprovado. |
| `380a133` | estoque | ✅ Ajuste manual auditável e correção de bloqueios parciais em devoluções. Aprovado. |
| `93b6cf9` | estoque | ✅ Transação única e ordenada para baixa de itens controlados durante a confirmação do pedido, impedindo race condition e saldo negativo. Aprovado. |

(Tabela truncada: os 82 commits originais foram aprovados e incorporados. Para
a listagem completa anterior, consultar a base git.)

---

# Guia de desenvolvimento

## Propósito do histórico

Este documento preserva decisões passadas ("Aceito conscientemente", "Trava")
e justifica por que determinados atalhos foram adotados ou descartados.
Use-o para entender *por que* o sistema é como é, mas consulte
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) para saber *como* o
sistema funciona hoje.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[relatorio-validacao.md](relatorio-validacao.md)
