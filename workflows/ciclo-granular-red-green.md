# Ciclo granular red/green

## Objetivo e conclusão

Completar Bloco 2 + commits granulares + push + handoff + **CI REMOTO
VERDE**. O workflow multiagente trata um microproblema por vez, conforme
autorização da plataforma.

## Sequência

1. Selecionar uma microtarefa escritora e registrar ID, status, escopo,
   evidências, limites e modelo/esforço.
2. Executar testes vermelhos antes, quando aplicável.
3. Implementar a mudança delimitada.
4. Fazer review independente, proporcional ao risco.
5. Executar testes verdes depois; não alterar testes para esconder erro.
6. Criar commit focado após a revisão.
7. Fazer push, confirmar CI remoto verde no SHA publicado e realizar handoff
   objetivo com limites, rollback, evidências e lacunas.

## Economia e continuidade

Usar Luna/low para docs/triagem, Luna/medium para mudança delimitada,
Terra/high para review de dados/segurança e Sol/high somente como escalada
bloqueante. Reusar agentes/contexto e cápsulas concisas, sem repetições.
Preservar IDs/status/evidências para continuar os mesmos subagentes após
interrupção/compactação quando a plataforma permitir; não alegar retomada
garantida se indisponível e não simular subagentes.

O mesmo fluxo vale para desenvolvimento futuro por preferência explícita do
usuário, mantendo autorização da plataforma. Para typo, evitar cerimônia cara,
mas manter review e registrar a economia. Preservar mudanças preexistentes e
limites de segurança.

## Regra de não interrupção

Orientação explícita do usuário: nunca interromper subagentes em andamento,
independentemente do tempo que levem. Não usar `interrupt=true`, `close` ou
`terminate` em agente em andamento por impaciência/tempo; aguardar e retomar
IDs. Enfileirar mensagens de orientação sem interromper.

## Ferramentas e fallback

Usar o comando WSL robusto `--exec env PATH=... rtk`, não `-- env`. Como `rg`
não está disponível no WSL, usar `rtk /usr/bin/grep` ou leitura focada. O
`m1nd` first-minute Linux tentou e retornou `needs_authority`; o fallback
Graphify + prova direta é autorizado pelo payload.
