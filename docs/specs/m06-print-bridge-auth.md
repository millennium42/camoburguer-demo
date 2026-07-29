# M-06: Fechar autenticação do print bridge por padrão

## Objetivo
Exigir que o `print-bridge` opere sempre com autenticação fechada por padrão em qualquer ambiente, usando a variável de ambiente `PRINT_BRIDGE_TOKEN`. Permitir um modo inseguro (sem token) exclusivamente para desenvolvimento, o qual exige uma flag explícita `PRINT_BRIDGE_INSECURE_LOCAL=true` atrelada obrigatoriamente a um bind no `127.0.0.1`. Garantir que falhas de configuração impeçam a inicialização (fail-safe).

## Escopo
### Incluído
- Alteração do mecanismo de validação de configuração em `apps/print-bridge/src/server.js` (ou `index.js`).
- Exigência de `PRINT_BRIDGE_TOKEN` em todos os ambientes por padrão.
- Adição da flag `PRINT_BRIDGE_INSECURE_LOCAL=true`.
- Validação do host de bind do Fastify (rejeitar `0.0.0.0` se estiver em modo inseguro e exigir `127.0.0.1`).
- Atualização do Docker `docker-compose.yml`, `render.yaml` (ou similar) e `smoke.mjs` para fornecerem um token válido.
- A rota `/health` continuará pública, pois é o padrão de orquestradores. Todas as demais rotas (jobs, receipt, privacy) estarão protegidas.

### Fora do escopo
- Substituição do serviço bridge por serviço de impressão real.
- Alteração no `codebase-memory-mcp` (não versionar arquivos gerados).
- Criação de novos fluxos de impressão gráfica, o foco é a camada de segurança.

## Requisitos exatos
- REQ-001: Se `PRINT_BRIDGE_TOKEN` não for fornecido e a flag `PRINT_BRIDGE_INSECURE_LOCAL` não for `true`, o bridge deve abortar a inicialização (throw error / exit 1).
- REQ-002: Se a flag `PRINT_BRIDGE_INSECURE_LOCAL=true` for fornecida sem um token, a aplicação deve se associar obrigatoriamente (bind) à interface local `127.0.0.1`.
- REQ-003: Se a flag for `true` e tentar ouvir em `0.0.0.0`, deve abortar a inicialização.
- REQ-004: As rotas de spool, jobs e privacy deverão responder 401 caso um Bearer token não seja fornecido (quando o token for exigido).
- REQ-005: A comparação de tokens no backend deve continuar sendo constant-time.
- REQ-006: As credenciais ou tokens em texto claro não devem aparecer em logs ou respostas.

## Restrições
- CON-001: Nenhuma credencial pessoal ou fixa deverá ser versionada no código ou em `.env.example`.
- CON-002: A verificação de `NODE_ENV === "production"` para pular token deve ser removida. A proteção não baseia-se mais em NODE_ENV genérico.
- CON-003: `smoke.mjs` e containers devem estar com as variáveis devidamente supridas para não falharem.

## Casos extremos e falhas
- EDGE-001: Fornecimento de string vazia ou espaços em branco para token ou env flags -> devem ser tratados como ausentes.
- EDGE-002: Header `Authorization` incompleto ou malformado -> Rejeição com 401 sem estourar 500 no `timingSafeEqual`.

## Definição de concluído
- DONE-001: Rodar a aplicação bridge sem token ou flag falha fechado imediatamente.
- DONE-002: Configurações de `smoke.mjs`, infraestrutura (Docker/Render) devidamente atualizadas com geração randômica ou declaração de tokens mockados seguros.
- DONE-003: Testes automatizados (na matrix host x flag x token) e testes originais adaptados e passando.

## Rubrica de Autoavaliação

| Critério | Pontos |
|---|---:|
| Correção funcional e preservação dos invariantes | 30 |
| Testes de regressão, integração e casos-limite | 20 |
| Segurança, integridade transacional e concorrência | 15 |
| Aderência integral à especificação | 15 |
| Qualidade de código, clareza e manutenibilidade | 10 |
| Operação, observabilidade, documentação e rollback | 5 |
| Disciplina de escopo, commit e reprodutibilidade | 5 |
