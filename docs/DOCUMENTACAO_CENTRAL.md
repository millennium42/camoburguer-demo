# Documentação central do Camoburguer Demo

Este arquivo é um índice, não uma segunda cópia dos contratos. Em caso de divergência, prevalece o documento especializado e o código testado.

## Estado atual

- Demo local: validada em 2026-07-21 com 36/36 testes e smoke E2E.
- Deploy público: pode estar em versão anterior ao working tree.
- iFood/Delivery Much: adapters implementados atrás de flags, sem homologação real.
- Produção/dados reais: bloqueados por ausência de autenticação do operador e outros gates.

## Leitura por objetivo

| Objetivo | Fonte canônica |
|---|---|
| saber o que foi auditado e o que falta | [auditoria-tecnica-2026-07-21.md](auditoria-tecnica-2026-07-21.md) |
| revisar cada commit | [auditoria-commit-a-commit.md](auditoria-commit-a-commit.md) |
| entender atores/limites da demo | [contexto-operacional.md](contexto-operacional.md) |
| entender módulos, tabelas e fronteiras | [arquitetura-do-sistema.md](arquitetura-do-sistema.md) |
| entender captura e adapters | [canais-e-captura.md](canais-e-captura.md) |
| mudar estados/regras do pedido | [ciclo-do-pedido.md](ciclo-do-pedido.md) |
| mudar caixa/financeiro | [ciclo-financeiro.md](ciclo-financeiro.md) |
| mudar estoque | [estoque.md](estoque.md) |
| mudar pagamentos de comanda | [pagamentos-comandas.md](pagamentos-comandas.md) |
| mudar conteúdo/transporte do ticket | [padrao-ticket-cozinha.md](padrao-ticket-cozinha.md) |
| mudar automações | [automacoes-por-cenario.md](automacoes-por-cenario.md) |
| desenvolver com IA | [guia-de-desenvolvimento.md](guia-de-desenvolvimento.md) |
| publicar a demo no Render | [RENDER_DEPLOY.md](RENDER_DEPLOY.md) |
| planejar produção/integrações | [roteiro-fase2-producao.md](roteiro-fase2-producao.md) |
| consultar evidência de validação | [relatorio-validacao.md](relatorio-validacao.md) |
| consultar decisões históricas | [5w2h-evolucao.md](5w2h-evolucao.md) |

## Invariantes em uma página

- `orders` é o único núcleo operacional; cada rodada de comanda também é um pedido.
- Canal externo é adapter + mapping/event/command, nunca fluxo paralelo.
- Pedido, baixa de estoque e reserva de impressão são transacionais.
- Ticket enviado não é reescrito; correção gera efeito/ticket compensatório.
- Pagamento/estorno preserva histórico; saldo da comanda usa centavos.
- Financeiro é gerencial v1, sem fiscal e sem CMV por receita.
- SKU conhecido usa preço/nome do snapshot canônico.
- Evento externo é persistido antes de ACK.
- Cozinha imprime pelo `print_job`/bridge; navegador só imprime relatório de turno.
- CORS/rate limit não substituem autenticação.

## Definição de pronto

Uma mudança só está pronta quando:

1. preserva invariantes ou atualiza primeiro o contrato correspondente;
2. inclui regressão/contrato proporcional;
3. passa sintaxe, testes e o diff check CRLF-aware definido no guia;
4. passa build/smoke se tocar I/O, DB, integração, impressão ou infra;
5. diferencia prova direta de inferência;
6. atualiza Graphify depois de mudança central;
7. documenta risco, configuração, rollback e lacunas;
8. não chama demo de produção sem os gates do roteiro.

## Próxima prioridade

Autenticar e autorizar o posto operacional/API/SSE antes de conectar qualquer canal real. Depois: migrations + restore, sandbox iFood, contrato privado Delivery Much, worker/outbox observável e impressão física local.
