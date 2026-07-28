# Prompt 14 — Tornar o simulador de eventos confiável

> Use isoladamente para este **P2**. O simulador só pode operar com ambiente local/efêmero.

Antes de construir, verifique se a autenticação da API já existe e se o simulador pode obter credencial de demo por configuração segura, sem segredo embutido. Se não existir, bloqueie e reporte a dependência; não implemente autenticação neste escopo.

## Missão

Torne o simulador determinístico e incapaz de comunicar sucesso falso:

- validar `response.ok` e corpo esperado em toda chamada;
- reutilizar caixa aberto ou abrir somente quando permitido;
- consultar catálogo/seed atual, sem SKUs fixos inexistentes;
- interromper dependentes após falha;
- nunca construir URL com ID ausente;
- resumo verdadeiro por etapa e exit code diferente de zero em falha;
- autenticar conforme o prompt 02, sem segredo embutido.

Incluído: simulador/script, cliente HTTP, catálogo/caixa, propagação de IDs, saída, testes e docs.
Fora: seed destrutivo, dados reais, redesign do produto e correções de backend não necessárias ao simulador.

## Fluxo obrigatório

1. Leia `AGENTS.md`, contexto operacional, arquitetura, catálogo/estoque, ciclos, auditoria e workflow. Use WSL + `rtk`, `m1nd` primeiro e Graphify.
2. Subagente investigador somente leitura reproduz cada falha com servidor fake/ambiente efêmero. Outro subagente de QA cria matriz 2xx/4xx/5xx, timeout, corpo inválido, caixa existente e SKU ausente.
3. Execute **`/spec simulador-eventos-confiavel`**, criando somente `specs/simulador-eventos-confiavel.md` com `REQ/CON/EDGE/DONE`. Uma pergunta por mensagem se cenário/credencial de demo material não estiver definido.
4. Defina rubrica. Um único escritor executa **`/build simulador-eventos-confiavel`**.
5. Reviewer independente executa **`/review simulador-eventos-confiavel`**, sem editar. Repita até `APROVADA`; revisão final linha a linha P0/P1/P2. Não verificado/P0/P1 bloqueia.

## Aceite

- Cenários com e sem caixa aberto.
- SKU inválido, resposta não JSON, 4xx/5xx e timeout falham honestamente.
- Nenhuma request contém `/undefined/`.
- Etapa dependente não roda quando antecedente falha.
- Cenário feliz prova os efeitos finais e só então informa “concluído”.
- Exit code e resumo por etapa refletem o resultado real.
- Nenhum seed destrutivo, URL de produção ou segredo embutido.

## Ferramentas e frontend

Instale só o necessário, oficial, fixado e mínimo. Use `codebase-memory-mcp` se disponível/vinculado e skills auditados do `vercel-labs/agent-skills`.

Antes de `/spec`, se ausentes, tente obrigatoriamente instalar/configurar fora do repositório, em escopo de usuário, pelos upstreams oficiais `DeusData/codebase-memory-mcp` e `vercel-labs/agent-skills`, com versão/commit fixado, inspeção de scripts/permissões e prova de uso local. Fallback só após bloqueio documentado; não execute script remoto por pipe sem inspeção. Durante `/spec`, modifique apenas o arquivo da especificação.

Se houver UI do simulador, consulte ReactBits, 21st.dev, shadcn e getdesign.md para timeline/estados por etapa. Motion/GSAP/Anime.js podem apoiar transição acessível com `prefers-reduced-motion`; Three.js só se a spec provar valor e não prejudicar bundle/performance — normalmente não aplicável. Não instale tudo nem migre stack.

## Gates, Git e saída

Execute testes com HTTP fake e ambiente efêmero, `npm run check`, `npm test`, `npm run smoke` seguro, auditoria, `git diff --check` e Compose. Rode `rtk graphify update .` se o grafo existir ou `rtk graphify extract . --out .` se não existir. Valide guard contra produção.

Commits granulares exclusivos; push uma vez ao final com review aprovada, gates verdes e P0=0/P1=0/P2=0. Preserve mudanças, não force e confirme refs/branch.

Rubrica: rastreabilidade 25; correção 25; testes 20; segurança/migração/rollback 15; simplicidade 10; evidências 5. Autoavalie após aprovação, corrija dentro da spec, re-review e reescreva relatório até 100 ou ganho menor que 2. Mostre trajetória, matriz de cenários/IDs, exemplos de saída, commits, push e limites.
