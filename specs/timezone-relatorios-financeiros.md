# Spec — Timezone dos relatórios financeiros

## Semântica recomendada

- Timezone de negócio: `BUSINESS_TIME_ZONE`, padrão validado `America/Sao_Paulo`.
- Persistência continua em `TIMESTAMPTZ`/ISO UTC; conversão ocorre uma única vez na apresentação e nos buckets.
- Cancelamento reduz `paymentsByMethod` usando o método original persistido no lançamento compensatório; estorno sem método válido é bucket `unattributed` e torna a reconciliação explicitamente incompleta.
- `paymentsByMethod` representa líquido e sua soma deve reconciliar com `netSales` para lançamentos de venda/cancelamento/pagamento/estorno.

## Requisitos

- REQ-01: validar timezone IANA no boot e falhar fechado para valor inválido.
- REQ-02: funções financeiras recebem timezone explícito; não usam timezone implícito do processo.
- REQ-03: bucket horário usa `Intl.DateTimeFormat(..., { timeZone })` e suporta offset histórico/DST sem offset fixo.
- REQ-04: filtros `YYYY-MM-DD` representam o calendário operacional; qualquer filtro de instante deve exigir offset explícito.
- REQ-05: API inclui `businessTimeZone` e `reconciliation` no resumo.
- REQ-06: dashboard e ticket exibem horário operacional com o mesmo utilitário/configuração.
- REQ-07: cancelamento e estorno mantêm o método original nos lançamentos compensatórios.
- REQ-08: dataset idêntico produz resultado idêntico sob processos com `TZ=UTC` e `TZ=America/Sao_Paulo`.

## Restrições

- CON-01: sem biblioteca nova; usar `Intl`.
- CON-02: sem reescrita retroativa de timestamps.
- CON-03: compatibilidade: campos existentes permanecem; novos campos são aditivos.
- CON-04: rollback restaura agregação anterior sem alterar dados persistidos.

## Bordas

- EDGE-01: meia-noite local, virada de mês/ano e offsets históricos formam buckets corretos.
- EDGE-02: timestamp inválido ou civil sem offset gera 400, não interpretação local silenciosa.
- EDGE-03: soma por método iguala líquido; divergência expõe diferença e `balanced: false`.

## Pronto

- DONE-01: testes unitários e processos filhos sob dois `TZ` produzem JSON idêntico.
- DONE-02: cancelamento por método e `unattributed` têm testes explícitos.
- DONE-03: API e UI informam timezone de negócio.
- DONE-04: documentação registra persistência, conversão, compatibilidade e rollback.
