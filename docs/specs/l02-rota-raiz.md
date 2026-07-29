# L-02: Corrigir a rota raiz rejeitada pelo middleware

## Problema e Evidências
A rota `GET /` existe (retorna `{ status: "ok" }`) no código, mas o middleware `preHandler` a barra (`401 Rota nao classificada` ou `401 Nao autorizado`), pois ela não está em `PUBLIC_UI_PATHS` nem em nenhuma listagem de rotas permitidas publicamente ou no RBAC. O usuário não consegue atingir a raiz publicamente sem sessão, e quando atinge, recebe um payload inútil de API em vez do painel.

## Comportamento Atual e Desejado
- **Atual**: Acessar `GET /` sem cookie resulta em 401 do middleware.
- **Desejado**: Acessar `GET /` ou `HEAD /` redireciona para `/app/` sem precisar de sessão (é pública).

## Invariantes de Domínio e Segurança
- Mutações (POST/PUT/PATCH/DELETE) na raiz não devem ser públicas, caso tentadas, embora não devam existir.
- Dados operacionais (orders, finance) continuam rigorosamente protegidos.

## Estados e Transições Afetados
- N/A (Apenas redirecionamento HTTP).

## Contratos HTTP e de Persistência Afetados
- `GET /` retorna status `302 Found` e Location `/app/`.
- `HEAD /` retorna mesmo status.

## Estratégia de Migração e Compatibilidade
- Adicionar `"/"` ao `PUBLIC_UI_PATHS`.
- Atualizar a verificação `publicUi` para aceitar `HEAD` além de `GET`.
- Modificar o handler em `app.get("/", ...)` para `reply.redirect("/app/")`.

## Arquivos e Símbolos Prováveis
- `apps/api/src/server.js`:
  - `PUBLIC_UI_PATHS`
  - `isPublicRequest`
  - `app.get("/")`
- `tests/smoke.mjs` ou novos arquivos de testes (será criado `tests/l02-rota-raiz.test.js`).

## Testes Unitários, de Integração e Regressão
- Criar `tests/l02-rota-raiz.test.js` para certificar que `GET /` e `HEAD /` redirecionam.
- Testar POST na raiz (deve retornar 404 de Fastify, ou rejeitado se injetar algo).

## Observabilidade e Mensagens de Erro
- N/A (Redirect não loga erro).

## Riscos, Rollback e Fora de Escopo
- **Risco**: Loop de redirecionamento (Não acontecerá pois redireciona de `/` para `/app/`).
- **Fora do escopo**: Landing pages.

## Critérios de Aceitação Verificáveis
1. `GET /` redireciona para `/app/`.
2. `HEAD /` tem contrato coerente (sem crash/401).
3. Acesso à raiz não exige autenticação.
4. Mutações sem permissões e rotas sem auth (`/orders`) recebem 401.

## Autoavaliação

| Critério | Pontos | Como será medido |
|---|---:|:---|
| Correção funcional e preservação dos invariantes | 30 | O redirect acontece livremente, bloqueios em outras rotas continuam |
| Testes de regressão, integração e casos-limite | 20 | Teste novo em `l02-rota-raiz.test.js` cobre `GET` e `HEAD` e auth block. |
| Segurança, integridade transacional e concorrência | 15 | `isPublicRequest` só permite GET e HEAD. |
| Aderência integral à especificação | 15 | Segue os redirecionamentos. |
| Qualidade de código, clareza e manutenibilidade | 10 | Mudanças curtas no server.js. |
| Operação, observabilidade, documentação e rollback | 5 | Rollback trivial via git. |
| Disciplina de escopo, commit e reprodutibilidade | 5 | Alterado somente o escopo de redirecionamento HTTP raiz. |
