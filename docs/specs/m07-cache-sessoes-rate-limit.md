# M-07: Limitar estruturas de autenticação em memória e reduzir write amplification

## Problema e Evidências
1. `loginAttempts` (um `Map`) e `revokedTokens` (um `Set`) crescem indefinidamente na memória. Cada autenticação fracassada adiciona entradas em `loginAttempts`, e cada sessão revogada insere itens em `revokedTokens`. Um atacante pode enviar diversas requisições com `username`/`IP` aleatórios, sobrecarregando a memória do servidor Node.js até o limite e causando OOM (Out Of Memory).
2. A cada request autenticada (incluindo heartbeats do SSE, que ocorrem a cada 25 segundos), a função `authenticate()` de `apps/api/src/auth.js` atualiza indiscriminadamente o `last_seen_at` e `idle_expires_at` no banco de dados. Para 100 conexões SSE ativas simultâneas, ocorrem cerca de 4 writes no banco por segundo apenas para controle de ociosidade, o que gera grande Write Amplification e contenção transacional.

## Comportamento Atual e Comportamento Desejado
- **Atual**: O cache local cresce sem limites. A atualização do timestamp no DB ocorre em **todos** os usos de um token válido.
- **Desejado**: O cache local deve ser auto-limitado (Eviction O(1) determinístico, como um cache LRU ou Map estrito com max size e TTL) para nunca derrubar a máquina por OOM. A revogação deve continuar utilizando o PostgreSQL como Single Source of Truth (SSoT), e o cache local ser apenas para fail-open/redundância curta. A renovação de `last_seen_at` e `idle_expires_at` deve acontecer numa janela de no mínimo X minutos (ex: 5 minutos), evitando writes desnecessários no BD.

## Invariantes de Domínio e Segurança
- Um atacante não pode evadir o *rate limit* (5 tentativas/15 min) forçando a evicção de seu IP através de ataques Sybil ou flood, o rate limiter deve prever políticas anti-bypass, limitando total do mapa e possivelmente bloqueando floods sistemáticos.
- Se a gravação no BD de um logout/revoke falhar temporariamente, o backend local deve proteger a sessão pelo menos até o token estourar seu tempo de vida natural.
- Operações no mesmo milissegundo não podem estender a sessão absoluta (limite de 12 horas).
- Apenas o tempo ocioso (*idle time* de 8 horas) é recuado, a `expires_at` absoluta não.

## Estados e Transições Afetados
- Autenticação e SSE (Event streams).
- Revogação e logout de tokens.
- O rate limiter da rota de Login.

## Contratos HTTP e de Persistência Afetados
- O contrato HTTP permanece idêntico.
- Nenhuma alteração DDL, mas o schema DML precisará consultar o `last_seen_at` durante o `.query()` do `authenticate()` para avaliar o delta.

## Estratégia de Migração e Compatibilidade
- Adição de TTL e MaxSize transparentes ao módulo de `auth.js`.
- Totalmente compatível retroativamente, nenhuma alteração de interface.

## Arquivos e Símbolos Prováveis
- `apps/api/src/auth.js`: refatorar `loginAttempts` e `revokedTokens` para um controle auto-evict, e adicionar lógica de "renovação por batch/tempo" na função `authenticate()`.
- O DB schema do PostgreSQL (não modificado, mas referenciado no check `last_seen_at`).

## Testes Unitários, de Integração, Concorrência e Regressão
- Carga de alta cardinalidade no rate limit (`loginAttempts`): testar 10 mil chaves únicas para observar evicção sem crash.
- Carga `revokedTokens`: simular múltiplas revogações.
- Teste de janela de atualização: múltiplas chamadas simuladas não devem realizar UPDATE se ocorrerem dentro de < 5 minutos do `last_seen_at`. Apenas uma será gravada.
- Teste absoluto: a expiração absoluta de 12 horas não aumenta.

## Observabilidade e Mensagens de Erro
- Nenhuma alteração em mensagens públicas (as respostas de `401` permanecem as mesmas).
- Possibilidade de um job de limpeza em background varrer `auth_sessions` expiradas para reduzir o tamanho da tabela, reportando as exclusões sem PII.

## Riscos, Rollback e Fora de Escopo
- **Risco**: Uma estratégia ingênua de evicção do Rate Limiter pode liberar bloqueios de força bruta (ex: encher a memória de chaves forjadas expulsa a chave genuína atacada, permitindo novas tentativas). Solução: o Cache pode rejeitar novas entradas se estiver cheio e sob ataque, falhando "fechado" ou ter tamanho amplo o bastante.
- **Rollback**: Reverter `auth.js` ao estado anterior.
- **Fora do Escopo**: Implementação de Redis (documentado que se necessitar estado distribuído de attempts, Redis é essencial).

## Critérios de Aceitação Verificáveis
1. Mapas nunca excedem os limites (ex. `10_000` itens no `loginAttempts` ou `revokedTokens`).
2. Entradas expiradas são removidas automaticamente ou via job lazy.
3. 5 falhas no mesmo IP/user bloqueiam login.
4. SSE ativo há 5 minutos gera apenas 1 UPDATE no BD para recuo de idle, em vez de centenas de writes.
5. Limpeza assíncrona da tabela `auth_sessions` é executada (delete condicional).

## Autoavaliação e melhoria iterativa

| Critério | Pontos | Como será medido |
|---|---:|:---|
| Correção funcional e preservação dos invariantes | 30 | A autenticação continuará aceitando logins legítimos e revogando instantaneamente via cache e DB, comprovado por testes. |
| Testes de regressão, integração e casos-limite | 20 | Testes de alta cardinalidade simulando milhares de IPs confirmam limite de memória. Testes validam debounce do DB write. |
| Segurança, integridade transacional e concorrência | 15 | Rate Limiter com falha segura (não permite bypass por sobreposição de cache). Transações mantêm integridade. |
| Aderência integral à especificação | 15 | Evidências no código e testes para todos os itens exigidos no prompt original. |
| Qualidade de código, clareza e manutenibilidade | 10 | Evita dependências externas, implementando um `TtlMap` ou similar simples. Código sem lixo e bem estruturado. |
| Operação, observabilidade, documentação e rollback | 5 | Inclusão de loop de faxina e observabilidade do expurgo, além de `docs/specs` limpo. |
| Disciplina de escopo, commit e reprodutibilidade | 5 | Um único commit no formato Angular `fix(auth): limitar caches...` restrito a arquivos relevantes. |
