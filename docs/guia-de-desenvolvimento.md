# Guia de Desenvolvimento

## Objetivo

Este guia é o contrato executável para evoluir o Camoburguer Demo sem criar um segundo núcleo de pedidos. Toda mudança deve preservar pedidos externos, o ticket da cozinha, os efeitos financeiros idempotentes e a operação local por comandas.

## Prefixo estável e RAG

O contexto estável de qualquer implementação é formado por `AGENTS.md`, este guia, `docs/arquitetura-do-sistema.md` e a skill do papel atual. Esse prefixo deve permanecer na mesma ordem para favorecer prompt cache.

O contexto variável vem depois e deve ser pequeno:

1. `rtk m1nd agent first-minute --repo <raiz> --query <mudança> --json` para orientação e blast radius.
2. `rtk graphify query "<pergunta estrutural>"` para recuperar somente o subgrafo relevante.
3. Leitura direta dos arquivos apontados e prova por teste/runtime.

Não existe banco vetorial no produto. m1nd e Graphify são ferramentas de desenvolvimento, não dependências de produção.

## Fluxo Git baseado na main

1. Atualizar a branch-base e garantir árvore limpa.
2. Criar `codex/<entrega>` sempre a partir de `main` atualizada.
3. Implementar uma entrega coesa, com documentação e testes no mesmo diff.
4. Atualizar Graphify pelo WSL e consultar ao menos um símbolo novo.
5. Solicitar revisão peer-to-peer com maker e reviewer distintos.
6. Manter um commit técnico por branch; correções de revisão entram por `commit --amend`.
7. Publicar e abrir PR draft apontando diretamente para `main`.
8. Se `main` avançar antes do merge, rebasear a branch em `main`, publicar com `--force-with-lease` e manter a PR apontada para `main`.

O commit descreve contexto, domínio, banco, API, frontend, documentação, testes, compatibilidade, riscos e rollback. A PR repete somente o necessário para avaliação e contém a evidência reproduzível.

## Implementação

- Reutilizar `packages/domain` para regras e `orders` para rodadas; canais não ganham núcleos paralelos.
- Usar migrações idempotentes no `schemaSql`, constraints nativas e transações PostgreSQL.
- Validar entrada na fronteira HTTP e manter valores monetários normalizados em centavos/casas decimais.
- Usar HTML nativo, CSS e JavaScript sem framework enquanto a interface permanecer pequena.
- Atualizar primeiro `docs/padrao-ticket-cozinha.md` quando o contrato impresso mudar.
- Não introduzir login, fiscal, CMV por receita, estoque de ingredientes ou integração automática com marketplaces sem novo requisito.

### Migrações e compatibilidade

- O `schemaSql` deve aceitar banco vazio e banco já populado; colunas/tabelas novas usam defaults ou nulabilidade compatíveis com dados anteriores.
- Constraints, índices e chaves estrangeiras são a última defesa, mas mensagens `400/409` devem explicar a regra na fronteira HTTP.
- Toda operação com múltiplos efeitos usa uma única transação. Não persistir pedido, baixa, ticket, pagamento ou financeiro pela metade.
- Dados auditáveis são append-only: correções geram cancelamento, reversão ou ajuste compensatório, nunca exclusão do histórico.
- O smoke cria primeiro um cenário legado e deixa a inicialização da API aplicar as migrações antes de exercitar as features novas.

## Validação

Execução local rápida:

```powershell
rtk npm test
rtk git diff --check
```

Stack integrada pelo WSL:

```powershell
rtk wsl.exe -d Ubuntu -- docker compose build
rtk wsl.exe -d Ubuntu -- docker compose up
rtk npm run smoke
rtk wsl.exe -d Ubuntu -- docker compose ps
```

Na validação assistida, manter `docker compose up` em primeiro plano, aguardar `api`, `ops-web` e `print-bridge` responderem aos healthchecks e executar o smoke em outro terminal. Em disco NTFS montado pelo WSL, o primeiro boot pode levar mais tempo; ausência de resposta antes do healthcheck não autoriza apagar volumes.

Graphify deve rodar pelo WSL. A versão Windows falha ao promover arquivos temporários dentro de `graphify-out/` neste workspace NTFS e a atualização direta em `/mnt/d` pode permanecer bloqueada em I/O. O script oficial sincroniza o código para `$HOME/.cache/camoburguer-demo/graphify-worktree`, atualiza em filesystem Linux e devolve somente os cinco artefatos rastreados:

```powershell
rtk npm run graph:update
rtk graphify explain "<símbolo novo>"
```

O primeiro comando executa `scripts/graphify-update-wsl.sh`; `query`, `path` e `explain` são consultas somente leitura e podem usar o CLI Windows. Antes da primeira atualização, provar `rtk wsl.exe -d Ubuntu -- bash -lc "command -v graphify && command -v rsync"`.

Se a atualização incremental falhar no staging, o próprio script executa `extract --code-only --no-cluster` seguido de `cluster-only`; não há chamada semântica nem banco vetorial no produto. O campo gerado `built_at_commit` identifica o commit-base lido antes da atualização e não pode ser igual ao próprio commit que adicionará o grafo. A freshness da PR é provada pelo conjunto: atualização executada depois da última edição, `manifest.json` atualizado, consulta do símbolo novo, JSON válido e árvore Git limpa após o commit.

## Revisão e aceite

A sequência de papéis está em `SUBAGENTES.md`. Cada gate registra estado `aprovado`, `aprovado com ressalvas` ou `rejeitado`, evidência, riscos e handoff. P0/P1 bloqueiam a promoção da PR; P2 deve ser corrigido ou registrado com responsável e condição objetiva de encerramento.

Antes de publicar como pronta:

- testes e smoke verdes;
- migração testada sobre banco existente;
- interface conferida em navegador, incluindo teclado e tela estreita;
- Graphify atualizado e consultável;
- 5W2H e documentos de domínio coerentes;
- rollback descrito sem perda de dados.

O `revisor_final` aplica `skills/release-readiness-review/SKILL.md` depois do QA e registra bloqueadores primeiro, riscos residuais e verificações manuais. A aprovação peer-to-peer deve vir de agente diferente do maker; papéis sem arquivos afetados registram “sem impacto” e justificam pela matriz da PR.

## Publicação e promoção

1. Conferir `git diff --check`, suíte, smoke, healthchecks, spool e interface.
2. Manter um único commit na branch; usar `commit --amend` para correções internas da mesma entrega.
3. Publicar com `git push -u origin codex/<entrega>` e abrir PR pública inicialmente como draft.
4. Incluir 5W2H, mudanças por camada, contrato, compatibilidade, evidências, riscos e rollback no corpo da PR.
5. Promover para pronta somente após peer review e ausência de P0/P1.
6. Toda PR deve ter `main` como base; se houver drift, rebasear em `main` e publicar com `--force-with-lease`.

## Rollback e solução de problemas

- Mudanças de schema são aditivas; rollback funcional desativa a nova rota/tela sem remover dados.
- Em conflito `409`, recarregar o agregado e repetir com nova chave idempotente somente se a intenção também for nova.
- Em falha de impressão, preservar o pedido e reprocessar o `print_job`; nunca recriar a venda.
- Em falha do Docker, verificar `docker compose ps`, healthchecks e logs no WSL antes de reconstruir volumes.
- Não apagar volumes ou reescrever histórico Git para corrigir um problema de aplicação.
