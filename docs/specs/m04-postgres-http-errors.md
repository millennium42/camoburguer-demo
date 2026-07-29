# M-04: Mapear erros de entrada do PostgreSQL para respostas HTTP corretas

## Objetivo
O `error handler` atual utiliza regex apenas quando `error.code` está ausente, deixando erros com código gerados pelo PostgreSQL (ex: FK, unique constraint, check constraint, invalid type) passarem como status HTTP 500 (Erro Interno). O objetivo é interceptar códigos específicos de erros do PostgreSQL que indicam falha do cliente (payload inválido ou conflito de estado) e mapeá-los para respostas HTTP `400 Bad Request`, `409 Conflict` ou `422 Unprocessable Entity` seguras, sem expor metadados internos (SQL, schema, tokens, constraints).

## Escopo
### Incluído
- Criação de um utilitário/mapper isolado para erros PostgreSQL.
- Mapeamento dos códigos PostgreSQL:
  - `22007`, `22008`, `22P02` (data, hora, tipos inválidos) → `400 Bad Request`
  - `23505` (unique constraint / concorrência) → `409 Conflict`
  - `23503` (foreign key) → `409 Conflict` ou `422 Unprocessable Entity` (conforme mais adequado)
  - `23514` (check constraint) → `422 Unprocessable Entity`
- Atualização do Fastify error handler principal (em `server.js` ou equivalente).
- Mascaramento e sanitização rigorosa de `message`, impedindo o vazamento da mensagem original do banco de dados (que pode conter valores inseridos pelo usuário ou nomes de tabelas).
- Testes unitários para a função de mapeamento.
- Testes HTTP reais injetando cada uma das falhas.

### Fora do escopo
- Refatorar a API inteira ou criar um framework global novo para erros.
- Alterar as mensagens e status HTTP de erros customizados de domínio que já funcionam (`error.statusCode < 500` e validações manuais).

## Requisitos Exatos
- REQ-001: Se um erro do banco for capturado pelo error handler e tiver o código `22007`, `22008` ou `22P02`, a resposta deverá ser `400` com uma mensagem genérica sobre "dados ou tipos inválidos", mantendo o log interno como 500 ou warning, mas não expondo a `message` do DB no payload HTTP.
- REQ-002: Se o código for `23505` (unique constraint), a resposta será `409` com mensagem "Conflito de estado ou registro já existente".
- REQ-003: Se o código for `23503` (FK violation), a resposta será `422` (ou `409`) com mensagem "Referência inválida ou registro não encontrado".
- REQ-004: Se o código for `23514` (check constraint), a resposta será `422` com mensagem "Regra de negócio violada".
- REQ-005: Erros desconhecidos (`error.code` postgres não mapeado) deverão continuar caindo no fallback `500` genérico.
- REQ-006: Logs internos para erros 500 devem incluir a requisição (correlationId/requestId) para facilitar diagnóstico, e os 400/409/422 logados adequadamente.

## Restrições
- CON-001: A mensagem original do PostgreSQL nunca deve ser refletida de volta na resposta JSON. O objeto de erro enviado ao cliente não deve conter queries SQL.
- CON-002: Não alterar testes pré-existentes a não ser que validassem o comportamento 500 errado que estamos corrigindo.

## Casos Extremos e Falhas
- EDGE-001: Um erro de validação Joi/Yup ou outro erro da camada Fastify não pode ser acidentalmente interpretado como erro PostgreSQL. Garantir que apenas classes ou strings adequadas do pg-node sejam submetidas ao mapeamento.
- EDGE-002: Concorrência agressiva (várias transações colidindo em `23505` simultaneamente) não deve derrubar o processo; deve retornar `409` e permitir retry dos clientes.

## Definição de Concluído
- DONE-001: Existe um mapeador que processa os erros pg.
- DONE-002: O error handler o consome.
- DONE-003: Testes unitários comprovam a conversão segura.
- DONE-004: Testes de integração enviam lixo/violações ao banco e comprovam retorno não-500 sem strings de banco.

## Rubrica de Autoavaliação (100 pontos)
| Critério | Pontos |
|---|---:|
| Correção funcional e preservação dos invariantes | 30 |
| Testes de regressão, integração e casos-limite | 20 |
| Segurança, integridade transacional e concorrência | 15 |
| Aderência integral à especificação | 15 |
| Qualidade de código, clareza e manutenibilidade | 10 |
| Operação, observabilidade, documentação e rollback | 5 |
| Disciplina de escopo, commit e reprodutibilidade | 5 |
