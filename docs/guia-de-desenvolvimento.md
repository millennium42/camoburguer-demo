# Guia de desenvolvimento assistido por IA

## Finalidade

Este é o contrato de trabalho para humanos e agentes de IA evoluírem o Camoburguer sem criar um segundo núcleo de pedidos, quebrar o ticket da cozinha ou confundir uma demo funcional com produção homologada.

Leia, nesta ordem:

1. `AGENTS.md` — regras operacionais do repositório;
2. este guia;
3. `docs/arquitetura-do-sistema.md`;
4. o documento de domínio afetado;
5. `docs/auditoria-tecnica-2026-07-21.md` para riscos conhecidos;
6. `SUBAGENTES.md` somente se a entrega justificar papéis especializados.

## Estado que o agente deve assumir

- A versão é uma **demo**, sem login de operador.
- iFood e Delivery Much ficam desabilitados até homologação.
- O deploy público pode estar atrás do `HEAD`; comprovar versão antes de diagnosticar.
- `orders` é o único núcleo operacional; uma comanda é uma coleção comercial de rodadas.
- O contrato textual do ticket é estável e precede mudanças de implementação.
- Financeiro é gerencial v1: sem fiscal, ficha técnica ou CMV por receita.

## Ambiente padrão: Ubuntu no WSL

Pré-requisitos: WSL 2/Ubuntu, Node.js 22+, npm, Git, Docker Desktop com integração WSL, PostgreSQL 16 via Compose, `rtk`, `m1nd` e Graphify.

Abra o Ubuntu/WSL e trabalhe pelo path Linux do repositório:

```bash
cd /mnt/c/Users/milla/Documents/Projetos/Git/camoburguer-demo
rtk npm ci
rtk npm run check
rtk npm test
```

Stack completa e isolada:

```bash
rtk proxy docker compose -p camoburguer-dev up -d --build
rtk proxy docker compose -p camoburguer-dev exec -T api node /app/scripts/seed-demo.mjs
rtk proxy env PRINT_BRIDGE_TOKEN=local-print-bridge-token npm run smoke
rtk proxy docker compose -p camoburguer-dev down
```

Use `down -v` somente em projeto de teste explicitamente nomeado e quando a exclusão do volume fizer parte da intenção. Nunca apague o volume padrão para “tentar de novo”.

## Orientação antes de editar

### Tarefa leve

Texto, typo ou ajuste local sem impacto de contrato:

1. `rtk git status --short`;
2. ler o arquivo e o teste diretamente relacionado;
3. aplicar a menor mudança;
4. executar o teste proporcional;
5. `rtk git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check`.

### Tarefa estrutural

Arquitetura, integrações, domínio, banco, financeiro, impressão, segurança ou deploy:

```bash
rtk proxy m1nd agent first-minute --repo . --query "descreva a mudança" --json
rtk graphify query "onde vive e quem depende do conceito afetado?"
rtk graphify path "origem" "destino"
rtk graphify explain "conceito"
```

Depois, confirme no código. Grafo é mapa, não evidência final; arquivos homônimos podem ser associados incorretamente.

Antes de editar, registre mentalmente ou no plano:

- requisito e fora de escopo;
- invariantes afetadas;
- tabelas/rotas/eventos/tickets tocados;
- blast radius;
- teste que falharia antes da correção;
- rollback seguro.

## Ordem de implementação

1. **Contrato/documento** — se ticket, payload público, estado ou regra operacional mudar.
2. **Teste de regressão/contrato** — fixture mínima que representa o risco.
3. **Domínio puro** — validação, cálculo e transição sem I/O.
4. **Persistência** — transação, lock, unicidade e migration.
5. **Adapter/API** — traduzir I/O para o contrato interno.
6. **UI** — apresentar estado; não duplicar regra de negócio.
7. **Observabilidade** — erro acionável, correlação e status de sync.
8. **Documentação e grafo**.
9. **Gates completos**.

Se uma etapa não se aplica, declare isso no handoff em vez de inventar artefato.

## Invariantes que toda IA deve preservar

### Pedido e comanda

- Um pedido finalizado nasce confirmado numa única transação.
- `Idempotency-Key` de criação é reutilizada em retry do mesmo payload.
- Rodada enviada é imutável do ponto de vista operacional; correção cria rodada compensatória.
- `delivery` exige endereço; `pickup` e `local` não persistem endereço irrelevante.
- SKU conhecido usa nome/preço do snapshot canônico, nunca os valores enviados pelo navegador.

### Estoque

- Baixa, pedido e `print_job` compartilham transação.
- Saldo nunca fica negativo e locks são obtidos em ordem determinística.
- Cancelamento/restituição precisa respeitar o estágio de preparo documentado.
- Não introduzir ingredientes/receitas na v1 sem decisão explícita.

### Financeiro

- Valores de comanda usam centavos inteiros na fronteira de pagamento.
- Lançamentos são compensados, não apagados.
- Forma não monetária altera faturamento, não numerário do caixa.
- Filtro de resumo e listagem deve ser o mesmo.

### Integração

- Evento externo é persistido de forma idempotente antes do ACK.
- ACK só ocorre depois do commit.
- ID externo é campo explícito; nunca derivar de UUID/chave local.
- Ação não suportada falha de forma visível; não marcar como concluída.
- Retry preserva a chave e tem limite/backoff observável.
- Canal é adapter: não criar tela, tabela ou máquina de estados paralela.

### Impressão

- Atualize `docs/padrao-ticket-cozinha.md` antes de mudar conteúdo/formato.
- Cozinha usa apenas `print_jobs` → API → bridge; navegador não dispara cópia paralela.
- Mesmo `jobId` gera um único arquivo.
- Bridge valida autenticação, tamanho e IDs; não revela filesystem.

### Segurança

- CORS e rate limit não são autenticação.
- Nunca habilitar canal real enquanto API/SSE operacionais estiverem públicos.
- Segredos ficam em ambiente/secret manager, nunca em HTML, commit ou log.
- Fallback demonstrativo nunca se apresenta como resposta de parceiro habilitado.
- Rotas destrutivas são fechadas por padrão e exigem autenticação separada.
- Renderização HTML de qualquer dado externo passa por `escapeHtml` ou `textContent`.

## Integrações: protocolo obrigatório

Para iFood/Delivery Much, o agente deve:

1. consultar documentação oficial atual;
2. registrar URL/versão/data consultada;
3. obter fixture sanitizada do payload real;
4. escrever teste de contrato para token, evento, detalhe e comando;
5. testar duplicata, fora de ordem, timeout, `401`, `429` e `5xx`;
6. provar persistência antes de ACK;
7. validar reconciliação manual e dead-letter;
8. manter feature flag desligada até o gate sandbox.

Não adivinhe endpoint privado da Delivery Much. Pare no gate e solicite acesso/fixture.

## Gates de qualidade

### Gate 0 — diff e sintaxe

```bash
rtk npm run check
rtk git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check
rtk git diff --stat
```

O sinalizador `cr-at-eol` trata o CRLF do checkout Windows como terminador de linha, mas ainda acusa espaços/tabs realmente excedentes.

### Gate 1 — unitário/contrato

```bash
rtk npm test
rtk npm audit --omit=dev
```

### Gate 2 — stack real

```bash
rtk proxy docker compose -p camoburguer-check up -d --build
rtk proxy docker compose -p camoburguer-check ps
rtk proxy docker compose -p camoburguer-check exec -T api node /app/scripts/seed-demo.mjs
rtk proxy env PRINT_BRIDGE_TOKEN=local-print-bridge-token npm run smoke
```

Verifique logs de API/bridge e só depois remova o projeto isolado:

```bash
rtk proxy docker compose -p camoburguer-check down -v
```

### Gate 3 — interface

- desktop operacional;
- viewport 390 × 844 sem overflow;
- teclado/foco/modais;
- console sem erro;
- SSE sai de “reconectando” quando abre;
- nenhum ticket de cozinha duplicado.

### Gate 4 — parceiro/produção

- sandbox e fixture real aprovados;
- autenticação de operador implantada;
- backup e restore provados;
- monitoramento/alerta e runbook;
- impressora física/contingência;
- aprovação explícita de release.

Sem Gate 4, use a expressão “demo validada”, nunca “production-ready”.

## Atualização do Graphify

Após código ou documentação central:

```bash
rtk graphify update .
rtk graphify query "o que mudou no fluxo afetado?"
```

Se o update incremental travar em NTFS, use o script versionado:

```bash
rtk proxy bash scripts/graphify-update-wsl.sh
```

Não comite caches temporários; revise o tamanho do diff do grafo antes de incluí-lo.

## Git e preservação do trabalho

- Comece por `rtk git status --short` e diferencie mudanças preexistentes.
- Não normalize EOL nem reformate arquivo inteiro junto de correção funcional.
- Um commit deve representar uma intenção revisável e incluir teste/documentação correspondente.
- Não reescreva histórico, resete ou apague mudanças do usuário.
- Merges exigem `npm run check`; marcador de conflito em JS é bloqueador.
- Não faça push/deploy sem pedido ou autorização explícita.

Formato recomendado:

```text
fix(integrations): persistir evento antes do ack

Contexto: ...
Risco: ...
Evidência: npm test; smoke; fixture sandbox ...
```

## Prompt-base para uma próxima IA

```text
Objetivo: <resultado observável>
Fora de escopo: <limites>
Invariantes: núcleo único, ticket estável, financeiro v1
Ambiente: Ubuntu/WSL; todo shell via rtk
Orientação: m1nd primeiro, Graphify antes de navegação ampla
Critérios de aceite: <testes e comportamento>
Risco/rollback: <impacto e reversão>
Entrega: código + testes + docs + evidência; sem push/deploy sem autorização
```

## Handoff obrigatório

Toda entrega deve informar:

- resultado alcançado;
- paths tocados;
- decisões e premissas;
- o que foi provado e comandos usados;
- o que não pôde ser provado;
- riscos abertos por severidade;
- migração/configuração necessária;
- rollback;
- próximo menor passo seguro.

## Próximos passos recomendados

1. autenticação/autorização do posto e proteção de API/SSE;
2. migrations versionadas e backup/restore;
3. fixtures + sandbox iFood;
4. contrato privado + sandbox Delivery Much;
5. outbox/worker observável para comandos e ACKs;
6. modularização gradual de `server.js` e `main.js`;
7. agente local de impressão física;
8. carga, métricas e runbook de incidente.

O detalhamento e a justificativa estão na [auditoria técnica](auditoria-tecnica-2026-07-21.md).
