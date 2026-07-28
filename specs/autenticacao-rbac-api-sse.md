# Autenticacao obrigatoria e RBAC na API e SSE

## Objetivo

Proteger o painel operacional contra leitura ou mutacao anonima. Operadores autenticados usam uma sessao opaca em cookie; cada rota e stream aplica autorizacao por papel e registra o ator nas acoes sensiveis.

## Escopo

### Incluido

- Login, logout, bootstrap controlado do primeiro administrador, sessoes revogaveis e rate limit de login.
- Default-deny para API operacional, rotas de integracao e SSE.
- Papéis `admin`, `operator` e `kitchen`, matriz rota × papel e auditoria de ator.
- Transporte de sessao no painel e autenticacao do SSE com cookie.
- CSRF nas mutacoes autenticadas, configuracao e documentacao de deploy.
- Testes de API, RBAC, expiracao/revogacao, CSRF e SSE.

### Fora do escopo

- SSO, gerenciamento avancado de usuarios, origem separada para painel e API, e redesign geral do painel.

## Decisoes acordadas

- A sessao e opaca e servida por cookie `HttpOnly; Secure; SameSite=Strict`.
- Painel e API sao publicados no mesmo site.
- A sessao expira apos 8 horas de inatividade ou 12 horas absolutas e e revogada no logout e na alteracao de credencial.
- O primeiro administrador e criado somente uma vez com o identificador `admin` e `ADMIN_BOOTSTRAP_PASSWORD` fornecida no ambiente de deploy; esse segredo nunca e retornado, gravado em log ou embutido no repositorio.
- Apenas `POST /auth/login` e um healthcheck minimo sem dados operacionais sao publicos.
- Login permite no maximo cinco tentativas por 15 minutos por combinacao de IP e identificador, sempre com resposta generica.
- `admin` possui acesso total; `operator` opera pedidos, comandas, caixa e financeiro, mas nao administra, configura credenciais/integracoes nem reprocessa operacoes sensiveis; `kitchen` le pedidos operacionais e atualiza somente preparo/pronto.

## Requisitos exatos

- REQ-001: Toda rota atual ou futura sob a API operacional deve exigir autenticacao, salvo as duas excecoes publicas explicitamente listadas nesta especificacao; rota nao classificada deve retornar `401`.
- REQ-002: Ausencia, invalidade, expiracao ou revogacao de sessao deve retornar `401` antes de ler, mutar ou publicar qualquer dado operacional.
- REQ-003: Autenticacao valida deve identificar um usuario persistido e um dos papeis `admin`, `operator` ou `kitchen`; a autorizacao insuficiente deve retornar `403`.
- REQ-004: A matriz rota × papel deve ser centralizada e cobrir pedidos, comandas, estoque, caixa, financeiro, clientes, integracoes, administracao, impressao sensivel e cada stream SSE.
- REQ-005: O administrador bootstrap deve ser criado somente quando nao existir administrador e somente com `ADMIN_BOOTSTRAP_PASSWORD`; tentativas posteriores nao podem recriar, redefinir ou expor a conta.
- REQ-006: Login bem-sucedido deve criar sessao opaca persistida, enviar somente o identificador da sessao no cookie acordado e renovar a janela de inatividade sem ultrapassar o limite absoluto.
- REQ-007: Logout e alteracao de credencial devem revogar as sessoes afetadas; uma requisicao ou reconnect posterior deve receber `401`.
- REQ-008: Todas as mutacoes autenticadas devem exigir protecao CSRF adequada ao cookie, e falhas CSRF devem ocorrer antes de efeitos de dominio.
- REQ-009: `/events/orders` e `/events/finance`, e qualquer stream futuro, devem autenticar e autorizar antes de inscrever ou emitir dados; reconexao expirada ou revogada nao pode receber evento algum.
- REQ-010: O painel deve enviar credenciais de sessao nas chamadas e no `EventSource`, apresentar erro de autenticacao sem armazenar token em URL, localStorage ou logs, e permitir login/logout acessivel.
- REQ-011: Acoes sensiveis devem persistir o identificador do ator com a menor quantidade necessaria de dados, sem registrar cookie, senha, segredo ou PII dispensavel.

## Restrições

- CON-001: Nao usar JWT em query string, nem token duradouro em localStorage, URL, logs ou payload SSE.
- CON-002: O CORS deve aceitar apenas a origem exata do mesmo site configurado e nao pode combinar credenciais com `*`.
- CON-003: Cookies `Secure` somente podem ser transmitidos em HTTPS; o ambiente de teste local deve ter mecanismo explicito e isolado sem enfraquecer configuracao de deploy.
- CON-004: Senhas devem ser armazenadas com derivacao resistente e parametro versionado; segredos de configuracao nao entram em arquivos rastreados.
- CON-005: A mudanca deve preservar, com teste explicito, a protecao atual de administracao demo ou substitui-la por regra RBAC equivalente mais restritiva.
- CON-006: Nenhum dado operacional pode ser enviado no healthcheck publico ou antes da autorizacao de SSE.

## Casos extremos e falhas

- EDGE-001: Uma rota adicionada sem classificacao de papel recebe `401`, nao permissao implicita.
- EDGE-002: Sessao expirada entre a abertura e a reconexao SSE encerra ou recusa o stream sem vazar eventos pendentes.
- EDGE-003: Requisicoes simultaneas de bootstrap produzem no maximo um administrador e nao expõem se a senha de bootstrap esta correta.
- EDGE-004: O sexto login na janela definida recebe resposta generica de rate limit sem revelar existencia de usuario; apos a janela, login valido pode prosseguir.
- EDGE-005: CSRF ausente, invalido ou de outra sessao nao altera estado, inclusive em rotas de integracao e administracao.
- EDGE-006: Falha de persistencia ao criar, renovar ou revogar sessao nao autentica parcialmente nem deixa cookie utilizavel.

## Definicao de concluido

- DONE-001: Teste automatizado prova `401` para ausencia ou sessao invalida em cada familia de rota e em uma rota de teste nao classificada.
- DONE-002: Teste automatizado prova a matriz acordada: cozinha nao acessa caixa/financeiro/clientes/admin; operador nao acessa administracao, credenciais/integracoes ou reprocessamento sensivel; admin acessa os recursos permitidos.
- DONE-003: Testes provam expiração por inatividade e maximo absoluto, logout, alteracao de credencial, rate limit e bootstrap unico sem segredos em resposta ou logs.
- DONE-004: Testes com dois clientes SSE provam que apenas papel autorizado recebe eventos, e que expiracao, revogacao e reconnect nao vazam evento.
- DONE-005: Testes provam que mutacoes sem CSRF falham sem efeitos e que o painel autentica API/SSE sem token em URL ou armazenamento inseguro.
- DONE-006: `npm run check`, `npm test`, smoke autenticado isolado, auditoria de dependencias pertinente e `git diff --check` passam; a documentacao descreve migracao, rollback sem retorno a API anonima e limites nao executados.
