# Prompt para modo planejamento — cardápio, balcão e comandas

Use este prompt no modo planejamento do Codex para gerar um plano de implementação completo, aderente ao estado atual do repositório, à metodologia vigente e aos contratos operacionais já documentados.

## Prompt

```md
Você está no modo planejamento, trabalhando no repositório `camoburguer-demo`.

Sua missão é produzir um plano de implementação detalhado, pragmático e sequenciado para evoluir o software sem quebrar o núcleo atual. Não escreva código ainda. Primeiro entenda o sistema atual, depois proponha a execução.

## Regras de trabalho obrigatórias

Antes de planejar, leia e respeite, nesta ordem:

1. `AGENTS.md`
2. `docs/guia-de-desenvolvimento.md`
3. `docs/arquitetura-do-sistema.md`
4. `docs/ciclo-do-pedido.md`
5. `docs/padrao-ticket-cozinha.md`
6. `docs/canais-e-captura.md`
7. `docs/contexto-operacional.md`
8. `docs/estoque.md`
9. `docs/pagamentos-comandas.md`
10. `docs/auditoria-tecnica-2026-07-21.md`
11. `workflows/camoburguer-implementation-flow.md`

Se precisar localizar dependências e blast radius, use o fluxo atual do projeto:

- Ubuntu no WSL
- `rtk` como prefixo dos comandos
- `m1nd` como primeira camada estrutural
- Graphify para mapa persistente e relações

## Invariantes que você deve preservar

- `orders` continua sendo o único núcleo operacional.
- `service_tabs` continua sendo o agregado comercial de comanda/mesa.
- Não criar segundo fluxo operacional paralelo para canal, balcão, bebidas ou bomboniere.
- O contrato textual do ticket é estável e vem antes da implementação.
- UI não deve duplicar regra de negócio do backend/domínio.
- Estoque v1 continua por categoria pronta (`xis`, `dog`, `hamburguer`) e não deve inventar controle novo sem necessidade explícita.
- Financeiro continua gerencial v1.
- Correções e mudanças devem respeitar idempotência, atomicidade e rollback documentados.

## Escopo da mudança

Planeje as feats/fixes abaixo:

1. Possibilidade de adicionar, editar, pausar e deletar itens do cardápio.
2. Bebidas e bomboniere não seguem o mesmo fluxo de cozinha porque já são entregues diretamente no balcão, mas precisam continuar aparecendo na mesma rodada do lanche como orientação operacional para tele/garçom.
3. Possibilidade de atribuir um pedido em andamento a uma comanda:
   - criar uma nova comanda a partir do pedido atual; ou
   - mover/vincular o pedido para uma comanda aberta existente.

Considere apenas os três itens acima. Ignore qualquer item vazio ou marcador solto fora desta lista.

## Intenção de negócio que deve orientar o plano

- O operador precisa manter o cardápio sem depender de edição manual de snapshot em código.
- Bebidas e bomboniere precisam aparecer no contexto do atendimento, mas não devem entrar como gargalo de preparo da cozinha.
- Um pedido já em andamento precisa poder virar consumo local com comanda sem recomeçar o fluxo e sem quebrar ticket, estoque, financeiro ou rastreabilidade.

## Restrições e cuidados específicos

### Cardápio

- Não planeje um CRUD ingênuo que contradiga o snapshot canônico atual sem explicar a transição.
- Deixe claro se haverá separação entre snapshot base e overrides operacionais, ou se haverá outra estratégia mais simples.
- Explique como pause/disponibilidade conversa com itens já presentes em pedidos existentes.
- Explique impacto em `/catalog`, domínio, persistência, seed, smoke e UI.

### Bebidas e bomboniere

- Não criar uma segunda fila de produção.
- Não remover esses itens do ticket da rodada.
- O plano deve definir como esses itens aparecem no ticket e na operação:
  - se recebem marcação textual específica;
  - se afetam ou não status de preparo;
  - se exigem nova classificação de item no catálogo;
  - se alteram ou não regras de estoque nesta v1.
- Se o contrato do ticket mudar, o plano deve começar atualizando `docs/padrao-ticket-cozinha.md`.

### Pedido em andamento -> comanda

- Preservar o núcleo atual: pedido operacional continua sendo `order`.
- Não apagar ticket emitido nem reescrever histórico.
- Deixar explícito em que estados a vinculação é permitida e em quais deve ser bloqueada.
- Explicar se a operação é apenas de vínculo comercial (`tabId`, `roundNumber`, metadados) ou se exige emissão de nova rodada/ticket em alguns casos.
- Explicar efeito em pagamentos, fechamento da comanda, cancelamentos e visualização no frontend.

## O que você deve investigar antes de propor a execução

- Onde o catálogo vive hoje e quais endpoints/tabelas/fixtures o alimentam.
- Como os tipos de item e categorias impactam ticket, estoque e fila.
- Como `orders`, `service_tabs`, `rounds`, cancelamentos e pagamentos se relacionam hoje.
- Quais testes existentes já cobrem catálogo, comandas, rounds, cancelamentos, ticket e smoke.
- Qual o menor caminho de implementação que respeita a arquitetura atual.

## Formato obrigatório da resposta

Responda em português e entregue exatamente nesta estrutura:

1. **Leitura do estado atual**
   - o que foi confirmado diretamente no código e docs
   - o que ainda é inferência ou precisa de validação adicional

2. **Decisões de modelagem**
   - proposta para cardápio
   - proposta para bebidas/bomboniere
   - proposta para vincular pedido em andamento a comanda
   - invariantes preservadas
   - trade-offs aceitos

3. **Plano de implementação em fases**
   - fase a fase, na ordem do workflow atual do projeto
   - para cada fase: objetivo, arquivos prováveis, contratos alterados, riscos e critério de pronto

4. **Blast radius**
   - tabelas
   - endpoints
   - domínio
   - frontend
   - impressão
   - smoke/tests/docs

5. **Matriz de testes**
   - testes unitários
   - testes de contrato
   - testes de UI
   - smoke/E2E
   - casos de regressão obrigatórios

6. **Riscos e travas**
   - o que pode dar errado
   - o que precisa de decisão humana antes de codar
   - o que deve ficar explicitamente fora de escopo

7. **Sequência recomendada de execução**
   - checklist objetivo para uma futura etapa de implementação

## Requisitos de qualidade da resposta

- Não responder com plano genérico.
- Não propor arquitetura paralela.
- Não esconder impactos em ticket, estoque, pagamentos ou SSE.
- Apontar explicitamente quando uma decisão exigir atualização documental antes do código.
- Diferenciar o que é comprovado no repositório do que é hipótese.
- Se houver ambiguidade no termo `bomboniere` versus `bombournie`, registrar isso como ponto de nomenclatura a validar, sem bloquear o restante do plano.
```

## Observação de uso

Se quiser, este prompt pode ser usado como base para uma próxima etapa em que o modo planejamento já devolva também uma sequência de PRs ou fatias de entrega.
