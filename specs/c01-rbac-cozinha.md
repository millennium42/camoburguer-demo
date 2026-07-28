# Corrigir escalada de privilégio da função kitchen (C-01)

## Objetivo

Garantir que o papel `kitchen` receba acesso estrito e exclusivo à autorização das operações estritamente necessárias ao preparo dos pedidos (`orders:prepare`), removendo sua equivalência involuntária com a permissão genérica `orders`, eliminando qualquer decisão de autorização fundamentada em parâmetros ou campos no corpo (body) da requisição e assegurando a validação de transições de status diretamente na rota competente, preservando ao mesmo tempo a negação por padrão (`default-deny`) e os acessos operacionais legítimos de `operator` e `admin`.

## Escopo
### Incluído
- Alteração da lógica na função `hasPermission()` (no arquivo `apps/api/src/auth.js`) para impedir que a posse de `orders:prepare` outorgue ou satisfaça a permissão genérica `orders`.
- Classificação explícita do endpoint de atualização de status de pedidos na função `permissionForRequest()` (`PATCH /orders/:orderId/status`) como requisitando a permissão `orders:prepare`, preservando as permissões exclusivas para endpoints de desconto, criação, cancelamento, vinculação de comanda e reimpressão.
- Extinção total no hook de autorização (`preHandler` no arquivo `apps/api/src/server.js`) de qualquer condicional que examine atributos do payload ou do corpo das requisições web para autorizar o acesso à rota.
- Validação robusta e transacional nas camadas competentes e no handler de `PATCH /orders/:orderId/status` de modo que sessões do papel `kitchen` operem de maneira permitida em rigorosas transições: unicamente `confirmed → in_preparation` e `in_preparation → ready` (juntamente com retentativas idempotentes idênticas e seguras).
- Suporte a testes determinísticos, tanto em nível de unidade para a matriz RBAC e regras de transição quanto com verificação real por chamadas HTTP, englobando transporte de sessões, verificação de cookies e segurança por tokens CSRF.

### Fora do escopo
- Modificação de esquemas ou migrações destrutivas na base PostgreSQL em deploy no servidor.
- Alteração nos fluxos de negócio gerais dos papéis `operator` ou `admin` que independem do abuso identificado para o papel da cozinha.

## Requisitos exatos
- REQ-001: A função `hasPermission(role, permission)` não deve em hipótese alguma outorgar ou autorizar a permissão genérica `orders` ao papel `kitchen` com base na permissão de preparo; especificamente, `hasPermission("kitchen", "orders")` precisará retornar `false`.
- REQ-002: O seletor de rotas `permissionForRequest(method, path)` tem que designar estritamente o par `PATCH /orders/:orderId/status` ao requisito de autorização `orders:prepare`, conservando rotas como `PATCH /orders/:orderId/discount`, `POST /orders/:orderId/tab-assignment`, `POST /orders`, `POST /orders/:orderId/reprint`, entre outras rotas operacionais, com seus requisitos nativos autorizados (como `orders`, `admin` ou `print:read`).
- REQ-003: O middleware e o hook global do servidor web (`preHandler` em `server.js`) não examinarão nem tomarão decisões de permissão inspecionando chaves do corpo das requisições submetidas pelo cliente (ex: remoção completa da inspeção por `request.body?.status` como exceção autorizável).
- REQ-004: O processador da rota `PATCH /orders/:orderId/status` deverá recusar sumariamente com status HTTP `403` e corpo `{ error: "Permissao insuficiente" }` se um usuário logado como `kitchen` solicitar qualquer transição fora das combinatórias permitidas `confirmed → in_preparation` e `in_preparation → ready` (com exceção de repetições estritamente idempotentes de estado idêntico para esses destinos admitidos).
- REQ-005: Sessões associadas aos papéis `operator` e `admin` reterão intocados os seus respectivos acessos plenos aos endpoints sob jurisdição operacional autorizada nas tabelas centrais do RBAC.

## Restrições
- CON-001: A segurança institucional exigida na erradicação desse exploit deve residir determinística e autonomamente no backend NodeJS/Fastify, inadmitindo delegação puramente ao front-end ou dependência implícita na engine do banco de dados relacional.
- CON-002: A verificação centralizada de roteamento exigirá "negação por padrão" (`default-deny`), retornando inegociáveis respostas HTTP `401` ({ error: "Rota nao classificada" }) no pré-processador caso depare-se com rota ausente de categorização explícita na matriz.
- CON-003: Mutações HTTP sob rotas autenticadas exigirão compulsoriedade e validação satisfatória do token de verificação CSRF previamente à alteração documental no sistema.

## Casos extremos e falhas
- EDGE-001: Operador logado como `kitchen` emite chamada forjada a `PATCH /orders/:id/discount` carregando em seu body o payload malicioso `{ status: "ready", discountPercent: 15 }`; como resultado do isolamento de payload e supressão da equivalência genérica em `hasPermission`, a infraestrutura bloqueará com resposta HTTP `403` sem processar cálculos da rota.
- EDGE-002: Autenticado sob papel `kitchen` aciona `PATCH /orders/:id/status` requisitando mutação de estado direto para `"cancelled"` ou `"completed"`; a rotina identificadora da transição repudiará o pedido com HTTP `403` sem alterar o status na base de dados.
- EDGE-003: Uma retentativa idempotente disparada por `kitchen` sobre um pedido que já consta em banco sob os estados `"in_preparation"` ou `"ready"`, pleiteando confirmação de transição para este idêntico estado consentido ao seu papel, será respondida civilmente por reavaliação idempotente sem disparar alarme artificial de exceção de segurança.
- EDGE-004: Acesso de clientes `kitchen` ou `operator` rumo a rotas não catalogadas recebem inexorável rejeição com retorno HTTP `401` informando ausência de classificação de segurança para a rota pretendida.

## Definição de concluído
- DONE-001: Exames unitários e analíticos em `tests/auth.test.js` ou análogos provam que a consulta `hasPermission("kitchen", "orders")` retorna incondicionalmente `false`.
- DONE-002: Bateria unitária em suíte de teste verifica sistemática e detalhadamente que o avaliador da transição aprova ordens sob gestão da cozinha excepcionalmente e exclusivamente sob a progressão `confirmed → in_preparation` ou `in_preparation → ready` (além das retentativas legítimas correspondentes), banindo mutações divergentes.
- DONE-003: Validações HTTP autossuficientes — injetadas de ponta a ponta munidas com instâncias reais da sessão autorizável em cookie e de cabeçalhos legítimos com token de validação CSRF — provam perante suíte de testes que chamadores do tipo `kitchen` recebem retorno inegociável HTTP `403` nas tentativas abusivas do tipo exploit contra aplicação de desconto forjado por inserção paralela do atributo `status`.
- DONE-004: Validações HTTP demonstrativas em suíte de testes garantem o repúdio com HTTP `403` perante tentativas por chamadores do grupo `kitchen` na criação de pedidos, solicitação de cancelamento, atribuição/vínculo a comandas, reimpressão ou invocação de endpoints de supervisão administrativa do catálogo na API.
- DONE-005: Suítes de validação de qualidade sintática, checagens contínuas da base e baterias de verificação de testes são bem-sucedidas no encerramento (`npm test`, `npm run check` e conformidade de sintaxe apurada sem resíduos por `git diff --check`).
