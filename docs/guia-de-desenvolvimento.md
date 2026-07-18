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

## Fluxo Git empilhado

1. Atualizar a branch-base e garantir árvore limpa.
2. Criar `codex/<entrega>` a partir da branch imediatamente anterior.
3. Implementar uma entrega coesa, com documentação e testes no mesmo diff.
4. Atualizar Graphify pelo WSL e consultar ao menos um símbolo novo.
5. Solicitar revisão peer-to-peer com maker e reviewer distintos.
6. Manter um commit técnico por branch; correções de revisão entram por `commit --amend`.
7. Publicar e abrir PR draft apontando para a branch anterior.
8. Após o merge da predecessora, rebasear a sucessora em `main`, publicar com `--force-with-lease` e retargetar a PR.

O commit descreve contexto, domínio, banco, API, frontend, documentação, testes, compatibilidade, riscos e rollback. A PR repete somente o necessário para avaliação e contém a evidência reproduzível.

## Implementação

- Reutilizar `packages/domain` para regras e `orders` para rodadas; canais não ganham núcleos paralelos.
- Usar migrações idempotentes no `schemaSql`, constraints nativas e transações PostgreSQL.
- Validar entrada na fronteira HTTP e manter valores monetários normalizados em centavos/casas decimais.
- Usar HTML nativo, CSS e JavaScript sem framework enquanto a interface permanecer pequena.
- Atualizar primeiro `docs/padrao-ticket-cozinha.md` quando o contrato impresso mudar.
- Não introduzir login, fiscal, CMV por receita, estoque de ingredientes ou integração automática com marketplaces sem novo requisito.

## Validação

Execução local rápida:

```powershell
rtk npm test
rtk git diff --check
```

Stack integrada pelo WSL:

```powershell
rtk wsl.exe -d Ubuntu -- docker compose up -d --build
rtk npm run smoke
rtk wsl.exe -d Ubuntu -- docker compose ps
```

Graphify deve rodar pelo WSL. A versão Windows falha ao promover arquivos temporários dentro de `graphify-out/` neste workspace NTFS:

```powershell
rtk npm run graph:update
rtk graphify explain "<símbolo novo>"
```

O primeiro comando escreve o grafo pelo Linux; `query`, `path` e `explain` são consultas somente leitura e podem usar o CLI Windows. Antes da primeira atualização, provar `rtk wsl.exe -d Ubuntu -- bash -lc "command -v graphify"`.

Se a atualização incremental falhar, executar `rtk npm run graph:extract:code`, validar `graphify-out/graph.json` como JSON e repetir a consulta. O campo gerado `built_at_commit` identifica o commit-base lido antes da atualização e não pode ser igual ao próprio commit que adicionará o grafo. A freshness da PR é provada pelo conjunto: atualização executada depois da última edição, `manifest.json` atualizado, consulta do símbolo novo, JSON válido e árvore Git limpa após o commit.

## Revisão e aceite

A sequência de papéis está em `SUBAGENTES.md`. Cada gate registra estado `aprovado`, `aprovado com ressalvas` ou `rejeitado`, evidência, riscos e handoff. P0/P1 bloqueiam a promoção da PR; P2 deve ser corrigido ou registrado com responsável e condição objetiva de encerramento.

Antes de publicar como pronta:

- testes e smoke verdes;
- migração testada sobre banco existente;
- interface conferida em navegador, incluindo teclado e tela estreita;
- Graphify atualizado e consultável;
- 5W2H e documentos de domínio coerentes;
- rollback descrito sem perda de dados.

## Rollback e solução de problemas

- Mudanças de schema são aditivas; rollback funcional desativa a nova rota/tela sem remover dados.
- Em conflito `409`, recarregar o agregado e repetir com nova chave idempotente somente se a intenção também for nova.
- Em falha de impressão, preservar o pedido e reprocessar o `print_job`; nunca recriar a venda.
- Em falha do Docker, verificar `docker compose ps`, healthchecks e logs no WSL antes de reconstruir volumes.
- Não apagar volumes ou reescrever histórico Git para corrigir um problema de aplicação.
