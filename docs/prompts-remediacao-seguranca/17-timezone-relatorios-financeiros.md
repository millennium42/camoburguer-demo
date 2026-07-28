# Prompt 17 — Timezone e reconciliação dos relatórios financeiros

> Use isoladamente para este **P2**. Não escolha silenciosamente uma semântica financeira.

## Missão

Torne relatórios determinísticos e coerentes com o horário operacional:

- timezone de negócio explícito e validado, com padrão documentado `America/Sao_Paulo`;
- nenhuma dependência do timezone implícito do processo;
- fronteiras de hora/dia e timestamps definidas;
- regra explícita para cancelamentos em `paymentsByMethod`;
- total por método reconcilia com o líquido conforme a regra acordada;
- o mesmo dataset gera o mesmo resultado sob `TZ` diferentes.

Incluído: agregações, configuração, dashboard, coerência com ticket, cancelamentos, testes e docs.
Fora: reescrita do financeiro, fiscal/CMV e mudança retroativa sem plano.

## Orquestração

1. Leia `AGENTS.md`, arquitetura, ciclo financeiro, pagamentos, padrão do ticket, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify.
2. Subagente investigador somente leitura rastreia timestamps e agregações SQL/JS. Outro especialista financeiro/testes projeta dataset, meia-noite, cancelamento e execução sob múltiplos `TZ`.
3. Execute **`/spec timezone-relatorios-financeiros`**, criando apenas `specs/timezone-relatorios-financeiros.md` com `REQ/CON/EDGE/DONE`. Faça uma pergunta por mensagem para decidir como cancelamento reduz método original, estorno sem método e efeito histórico.
4. Defina rubrica. Um único escritor executa **`/build timezone-relatorios-financeiros`**.
5. Reviewer independente executa **`/review timezone-relatorios-financeiros`**, sem editar. Repita até `APROVADA`; depois revisão linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Dataset idêntico sob UTC e `America/Sao_Paulo` produz relatório idêntico.
- Casos próximos a fronteiras de hora/dia são determinísticos.
- Datas históricas com offsets distintos e todas as fronteiras do calendário operacional configurado produzem buckets corretos, sem assumir offset fixo.
- Ticket e dashboard atribuem venda ao mesmo horário operacional.
- Venda seguida de cancelamento reconcilia total e método conforme contrato.
- Timestamps armazenados, conversão SQL/JS e configuração não aplicam timezone duas vezes.
- Mudança de interpretação histórica tem migração/compatibilidade/rollback explícitos.
- Biblioteca nova de timezone só entra se a plataforma atual não bastar.

## Ferramentas e frontend

Instale somente ferramentas oficiais indispensáveis, fixadas e mínimas. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados do `vercel-labs/agent-skills`.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, fixando versão/commit, inspecionando scripts/permissões e provando uso local. Fallback só após bloqueio documentado; nunca pipe script remoto sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Se a apresentação precisar mudar, consulte ReactBits, 21st.dev, shadcn e getdesign.md para exibir timezone/filtros claramente. Motion/GSAP/Anime.js só para transição mínima acessível; Three.js é não aplicável. Sem redesign nem dependência visual gratuita.

## Gates, Git e relatório

Execute testes sob múltiplos `TZ`, reconciliação financeira e regressão, `npm run check`, `npm test`, smoke seguro, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Produção somente leitura.

Commits granulares exclusivos; push uma vez no final após review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve mudanças, não force e confirme refs/branch.

Rubrica 25/25/20/15/10/5. Após aprovação, pontue, corrija dentro da spec, re-review e reescreva relatório até 100 ou ganho menor que 2. Entregue trajetória, regra de timezone/cancelamento, matriz de datasets/IDs, provas, commits, push, migração/rollback e limites.
