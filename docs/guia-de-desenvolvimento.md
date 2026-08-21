---
tags: [processo, desenvolvimento]
---

# Guia de Desenvolvimento — Camoburguer Demo

> Contrato de trabalho para humanos e agentes de IA evoluírem o Camoburguer
> sem criar um segundo núcleo de pedidos, quebrar o ticket da cozinha ou
> confundir uma demo funcional com produção homologada. Leia este guia e
> `AGENTS.md` antes de qualquer edição não trivial.

---

## Leitura obrigatória em ordem

1. [`AGENTS.md`](../AGENTS.md) — regras operacionais do repositório
2. Este guia
3. [`docs/arquitetura-do-sistema.md`](arquitetura-do-sistema.md)
4. O documento de domínio afetado
5. [`docs/relatorio-validacao.md`](relatorio-validacao.md) — para riscos conhecidos
6. [`SUBAGENTES.md`](../SUBAGENTES.md) — somente se a entrega justificar papéis
   especializados

## Estado que o agente deve assumir

- **Trava:** a versão é uma **demo**, sem login de operador.
- **Trava:** iFood e Delivery Much ficam desabilitados até homologação.
- O deploy público pode estar atrás do `HEAD`; comprovar versão antes de
  diagnosticar.
- `orders` é o único núcleo operacional; uma comanda é uma coleção comercial
  de rodadas.
- O contrato textual do ticket é estável e precede mudanças de implementação.
- **Financeiro gerencial v1:** sem fiscal, ficha técnica ou CMV por receita.

---

## Ambiente padrão: Ubuntu no WSL

Pré-requisitos: WSL 2/Ubuntu, Node.js 22+, npm, Git, Docker Desktop com
integração WSL, PostgreSQL 16 via Compose, `rtk`, `m1nd` e Graphify.

```bash
cd /mnt/c/Users/<usuario>/Documents/camoburguer-demo
rtk npm ci
rtk npm run check
rtk npm test
```

Stack completa e isolada:

```bash
rtk proxy env ADMIN_BOOTSTRAP_PASSWORD=local-demo-admin-password \
  docker compose -p camoburguer-dev up -d --build
rtk proxy env PRINT_BRIDGE_TOKEN=local-print-bridge-token \
  ADMIN_PASSWORD=local-demo-admin-password npm run smoke
rtk proxy docker compose -p camoburguer-dev down
```

Use `down -v` **somente** em projeto de teste explicitamente nomeado e quando a
exclusão do volume fizer parte da intenção. Nunca apague o volume padrão para
"tentar de novo".

---

## Seed de demonstração

`AUTO_SEED` deve ficar ausente ou exatamente `false`; boot e restart nunca semeiam.

Para uma carga explícita:
1. Configure `APP_ENV=demo`, `DEMO_SEED_ENABLED=true`,
   `DEMO_SEED_TARGET=endereco:porta/banco` e `ADMIN_BOOTSTRAP_PASSWORD`.
2. Autentique `admin` por `POST /auth/login`.
3. Chame `POST /demo/seed` com o cookie de sessão, CSRF e
   `{"confirmTarget":"endereco:porta/banco"}`.

O preflight bloqueia qualquer estado operacional, estoque não zero ou
divergência do catálogo canônico.

- **Trava:** `scripts/seed-demo.mjs` é somente cliente HTTP da API e nunca
  recebe `DATABASE_URL`.
- **Trava:** o commit `f3191d3` (fixa `AUTO_SEED=false` no Render) é um limite
  de rollback — não o reverta.

---

## Autenticação e rollback

O bootstrap cria `admin` somente quando ainda não existe administrador.
Configure `ADMIN_BOOTSTRAP_PASSWORD` pelo gerenciador de segredos; depois do
primeiro login, troque a credencial pela rota autenticada.

Sessões expiram após 8 horas de inatividade ou 12 horas absolutas. Logout e
troca de senha revogam sessões.

- Em HTTP local: `APP_ENV=development` e `AUTH_COOKIE_SECURE=false` —
  essa combinação é recusada fora de development/test.
- **Trava:** rollback de código deve preservar `users`, `auth_sessions` e
  `audit_events`. Não é permitido restaurar API/SSE anônima nem reativar
  `DEMO_ADMIN_TOKEN`.

---

## Orientação antes de editar

### Tarefa leve
Texto, typo ou ajuste local sem impacto de contrato:

```bash
rtk git status --short
# Ler o arquivo e o teste diretamente relacionado
# Aplicar a menor mudança
rtk git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check
```

### Tarefa estrutural
Arquitetura, integrações, domínio, banco, financeiro, impressão, segurança ou
deploy:

```bash
rtk proxy m1nd agent first-minute --repo . --query "descreva a mudança" --json
rtk graphify query "onde vive e quem depende do conceito afetado?"
rtk graphify path "origem" "destino"
rtk graphify explain "conceito"
```

Depois confirme no código. Grafo é mapa, não evidência final.

Antes de editar, registre:
- Requisito e fora de escopo
- Invariantes afetadas
- Tabelas/rotas/eventos/tickets tocados
- Blast radius
- Teste que falharia antes da correção
- Rollback seguro

### Ordem de implementação

1. **Contrato/documento** — se ticket, payload público, estado ou regra mudar
2. **Teste de regressão/contrato** — fixture mínima que representa o risco
3. **Domínio puro** — validação, cálculo e transição sem I/O
4. **Persistência** — transação, lock, unicidade e migration
5. **Adapter/API** — traduzir I/O para o contrato interno
6. **UI** — apresentar estado; não duplicar regra de negócio
7. **Observabilidade** — erro acionável, correlação e status de sync
8. **Documentação e grafo**
9. **Gates completos**

---

## Invariantes que toda IA deve preservar

### Pedido e comanda
- Um pedido finalizado nasce confirmado numa única transação.
- `Idempotency-Key` de criação é reutilizada em retry do mesmo payload.
- Rodada enviada é imutável do ponto de vista operacional; correção cria
  rodada compensatória.
- `delivery` exige endereço; `pickup` e `local` não persistem endereço.
- SKU conhecido usa nome/preço do snapshot canônico, nunca os valores enviados
  pelo navegador.

### Estoque
- Baixa, pedido e `print_job` compartilham transação.
- Saldo nunca fica negativo e locks são obtidos em ordem determinística.
- Cancelamento/restituição respeita o estágio de preparo.
- **Fora de escopo:** ingredientes/receitas na v1.

### Financeiro
- Valores de comanda usam centavos inteiros na fronteira de pagamento.
- Lançamentos são compensados, não apagados.
- Forma não monetária altera faturamento, não numerário do caixa.
- Filtro de resumo e listagem deve ser o mesmo.

### Integração
- Evento externo é persistido de forma idempotente antes do ACK.
- ACK só ocorre depois do commit.
- ID externo é campo explícito; nunca derivar de UUID/chave local.
- Ação não suportada falha de forma visível.
- Canal é adapter: não criar tela, tabela ou máquina de estados paralela.

### Impressão
- Atualizar `docs/padrao-ticket-cozinha.md` antes de mudar conteúdo/formato.
- Cozinha usa apenas `print_jobs` → API → bridge; navegador não dispara cópia.
- Mesmo `jobId` gera um único arquivo.
- Bridge valida autenticação, tamanho e IDs; não revela filesystem.

### Segurança
- CORS e rate limit não são autenticação.
- Nunca habilitar canal real enquanto API/SSE operacionais estiverem públicos.
- Segredos ficam em ambiente/secret manager, nunca em HTML, commit ou log.
- Renderização HTML de qualquer dado externo passa por `escapeHtml` ou
  `textContent`.

---

## Integrações: protocolo obrigatório

Para iFood/Delivery Much, o agente deve:

1. Consultar documentação oficial atual.
2. Registrar URL/versão/data consultada.
3. Obter fixture sanitizada do payload real.
4. Escrever teste de contrato para token, evento, detalhe e comando.
5. Testar duplicata, fora de ordem, timeout, `401`, `429` e `5xx`.
6. Provar persistência antes de ACK.
7. Validar reconciliação manual e dead-letter.
8. Manter feature flag desligada até o gate sandbox.

**Trava:** não adivinhar endpoint privado da Delivery Much. Parar no gate e
solicitar acesso/fixture.

---

## Gates de qualidade

### Gate 0 — diff e sintaxe

```bash
rtk npm run check
rtk git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check
rtk git diff --stat
```

### Gate 1 — unitário/contrato

```bash
rtk npm test
rtk npm audit --omit=dev
```

### Gate 2 — stack real

```bash
rtk proxy env ADMIN_BOOTSTRAP_PASSWORD=local-demo-admin-password \
  docker compose -p camoburguer-check up -d --build
rtk proxy docker compose -p camoburguer-check ps
rtk proxy env PRINT_BRIDGE_TOKEN=local-print-bridge-token \
  ADMIN_PASSWORD=local-demo-admin-password npm run smoke
rtk proxy docker compose -p camoburguer-check down -v
```

### Gate 3 — interface

- Desktop operacional
- Viewport 390 × 844 sem overflow
- Teclado/foco/modais
- Console sem erro
- SSE sai de "reconectando" quando abre
- Nenhum ticket de cozinha duplicado

### Gate 4 — parceiro/produção

- Sandbox e fixture real aprovados
- Autenticação de operador implantada
- Backup e restore provados
- Monitoramento/alerta e runbook
- Impressora física/contingência
- Aprovação explícita de release

Sem Gate 4: usar a expressão "demo validada", **nunca** "production-ready".

---

## Atualização do Graphify

Após código ou documentação central:

```bash
rtk graphify update .
rtk graphify query "o que mudou no fluxo afetado?"
```

Se o update incremental travar em NTFS:

```bash
rtk proxy bash scripts/graphify-update-wsl.sh
```

---

## Git e preservação do trabalho

- Comece por `rtk git status --short` e diferencie mudanças preexistentes.
- Não normalize EOL nem reformate arquivo inteiro junto de correção funcional.
- Um commit deve representar uma intenção revisável e incluir teste/documentação.
- Não reescreva histórico, resete ou apague mudanças do usuário.
- Merges exigem `npm run check`; marcador de conflito em JS é bloqueador.
- Não faça push/deploy sem pedido ou autorização explícita.

Formato de commit recomendado:
```text
fix(integrations): persistir evento antes do ack

Contexto: ...
Risco: ...
Evidência: npm test; smoke; fixture sandbox ...
```

---

## Handoff obrigatório após cada entrega

Toda entrega deve informar:
- Resultado alcançado
- Paths tocados
- Decisões e premissas
- O que foi provado e comandos usados
- O que não pôde ser provado
- Riscos abertos por severidade
- Migração/configuração necessária
- Rollback
- Próximo menor passo seguro

---

## Próximos passos recomendados

1. Autenticação/autorização do posto e proteção de API/SSE
2. Migrations versionadas e backup/restore
3. Fixtures + sandbox iFood
4. Contrato privado + sandbox Delivery Much
5. Outbox/worker observável para comandos e ACKs
6. Modularização gradual de `server.js` e `main.js`
7. Agente local de impressão física
8. Carga, métricas e runbook de incidente

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[AGENTS.md](../AGENTS.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[deploy-e-infraestrutura.md](deploy-e-infraestrutura.md) ·
[relatorio-validacao.md](relatorio-validacao.md)
