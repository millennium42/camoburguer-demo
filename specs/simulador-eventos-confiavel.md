# Spec — Simulador de eventos confiável

## Decisões recomendadas

- O simulador é um cliente HTTP local/efêmero da API; acesso direto ao PostgreSQL é proibido.
- A credencial vem somente de `DEMO_ADMIN_USERNAME` e `DEMO_ADMIN_PASSWORD`; não há segredo padrão.
- `API_BASE_URL` deve usar `http(s)` e host loopback, `localhost`, `api` ou `host.docker.internal`. Outros hosts são recusados antes da primeira request.
- O cenário reutiliza um caixa aberto ou abre um novo, escolhe o primeiro item disponível do catálogo e verifica os efeitos finais antes de concluir.

## Requisitos

- REQ-01: autenticar em `/auth/login`, preservar cookie e CSRF e validar status e JSON de toda resposta.
- REQ-02: aplicar timeout configurável a toda request e produzir erro com etapa, método, rota e status, sem revelar credenciais.
- REQ-03: consultar `/catalog` e selecionar SKU disponível; ausência de SKU elegível encerra o cenário.
- REQ-04: consultar `/cash-shifts`, reutilizar caixa aberto ou abrir um quando permitido.
- REQ-05: criar pedido com `Idempotency-Key`, propagar apenas IDs não vazios e impedir qualquer URL com `/undefined/` ou `/null/`.
- REQ-06: executar as transições dependentes sequencialmente e não iniciar uma etapa após falha antecedente.
- REQ-07: criar ajuste de caixa com chave idempotente e verificar pedido final, caixa e lançamento financeiro por GET.
- REQ-08: emitir resumo determinístico por etapa (`pending`, `completed`, `failed`, `skipped`) e definir `process.exitCode = 1` em qualquer falha.
- REQ-09: `scripts/simulate-order.mjs` deve reutilizar o mesmo cliente seguro, sem escrever no banco.

## Restrições

- CON-01: não executar seed, truncamento ou limpeza.
- CON-02: não aceitar URL de produção nem segredo embutido.
- CON-03: não registrar cookie, senha, CSRF ou corpo sensível.
- CON-04: somente recursos nativos de Node; sem dependência nova.

## Bordas

- EDGE-01: 4xx, 5xx, timeout, resposta não JSON e corpo inesperado falham honestamente.
- EDGE-02: caixa já aberto é reutilizado; corrida ao abrir caixa refaz a consulta uma vez.
- EDGE-03: catálogo vazio/indisponível ou SKU rejeitado impede criação e etapas dependentes.
- EDGE-04: resposta 2xx sem ID obrigatório é falha de contrato.

## Pronto

- DONE-01: testes com servidor HTTP fake cobrem cenário feliz, caixa existente, SKU ausente, 4xx, 5xx, timeout e JSON inválido.
- DONE-02: nenhum teste observa request contendo `/undefined/`.
- DONE-03: cenário feliz prova efeitos finais antes de imprimir `concluído`.
- DONE-04: documentação informa variáveis, guard local e limites.
- DONE-05: rollback é restaurar os dois entrypoints anteriores; não há migração de dados.
