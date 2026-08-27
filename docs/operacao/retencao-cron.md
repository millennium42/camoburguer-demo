# Agendamento diário da retenção

O job diário é o script executável `scripts/retention-daily.sh`. Ele exige
`DATABASE_URL` e `RETENTION_DATABASE_NAME`, executa o apply explicitamente
confirmado e termina com erro se houver limpeza externa pendente. O CLI não
chama `db.init()`, seed ou migrações.

## Render (opt-in)

O serviço cron deve usar `./scripts/retention-daily.sh` como `startCommand` e
um schedule UTC entre aspas. Por exemplo, `"0 6 * * *"` roda diariamente às
06:00 UTC (03:00 em São Paulo). A configuração não está ativa no
`render.yaml` deste repositório: cron Render tem custo próprio e a ativação
exige aprovação do plano/custo e configuração dos segredos no ambiente.

```yaml
services:
  - type: cron
    name: camoburguer-retention
    schedule: "0 6 * * *"
    buildCommand: npm ci
    startCommand: ./scripts/retention-daily.sh
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: camoburguer-db
          property: connectionString
      - key: RETENTION_DATABASE_NAME
        sync: false
      - key: PRINT_BRIDGE_URL
        sync: false
      - key: PRINT_BRIDGE_TOKEN
        sync: false
```

O cron não deve receber tráfego de entrada nem depender de disco local. Uma
interrupção após o commit do banco é recuperada pelo próximo disparo através
de `privacy_requests.status = 'pending_external_cleanup'`.
