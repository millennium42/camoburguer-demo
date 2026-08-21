---
tags: [indice, referencia]
---

# Documentação Central — Camoburguer Demo

> Este arquivo é um índice de referência da documentação arquitetural, operacional
> e histórica. Todo o conteúdo narrativo foi migrado para arquivos dedicados de
> domínio para refletir o padrão Fono. Em caso de divergência, prevalece o
> documento especializado e o código testado.

## Leitura por objetivo

| Objetivo | Fonte canônica |
|---|---|
| saber o que foi auditado e o que falta | [auditoria-tecnica-2026-07-21.md](auditoria-tecnica-2026-07-21.md) |
| revisar cada commit | [historico-evolucao.md](historico-evolucao.md) |
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
| publicar a demo no Render | [deploy-e-infraestrutura.md](deploy-e-infraestrutura.md) |
| consultar evidência de validação | [relatorio-validacao.md](relatorio-validacao.md) |
| consultar o design system | [DESIGN.md](DESIGN.md) |

## Invariantes em uma página

- `orders` é o único núcleo operacional; cada rodada de comanda também é um pedido.
- Canal externo é adapter + mapping/event/command, nunca fluxo paralelo.
- Pedido, baixa de estoque e reserva de impressão são transacionais.
- Ticket enviado não é reescrito; correção gera efeito/ticket compensatório.
- Pagamento/estorno preserva histórico; saldo da comanda usa centavos.
- Financeiro é gerencial v1, sem fiscal e sem CMV por receita.
- Captura manual usa preço/nome do snapshot canônico; adapters preservam a venda do parceiro e usam SKU conhecido somente para classificação operacional.
- Evento externo é persistido antes de ACK.
- Cozinha imprime pelo `print_job`/bridge; navegador só imprime relatório de turno.
- CORS/rate limit não substituem autenticação.

## Definição de pronto

Uma mudança só está pronta quando:

1. Preserva invariantes ou atualiza primeiro o contrato correspondente;
2. Inclui regressão/contrato proporcional;
3. Passa sintaxe, testes e o diff check CRLF-aware definido no guia;
4. Passa build/smoke se tocar I/O, DB, integração, impressão ou infra;
5. Diferencia prova direta de inferência;
6. Atualiza Graphify depois de mudança central;
7. Documenta risco, configuração, rollback e lacunas;
8. Não chama demo de produção sem os gates do roteiro cumpridos.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md)
