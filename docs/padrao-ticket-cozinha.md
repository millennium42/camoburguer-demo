---
tags: [impressao, ticket, fonte-da-verdade]
---

# Padrão de Ticket de Cozinha — Camoburguer Demo

> Fonte da verdade para o contrato do ticket. Atualizar **este documento antes
> de qualquer mudança de conteúdo, formato ou transporte de impressão** — o
> código implementa o que está aqui, não o contrário. O ticket corretivo e o
> ticket de entrega direta seguem as mesmas regras e estão documentados abaixo.

---

# Guia de uso

## Campos obrigatórios do ticket

- Identificador curto do pedido
- Identificador da comanda/mesa e número da rodada, quando o pedido já estiver
  vinculado no momento da emissão
- Horário de criação do pedido no fuso `America/Sao_Paulo`
- Canal
- Cliente
- Modo de entrega
- Endereço, somente em `delivery`
- Itens
- Adicionais em linhas recuadas logo abaixo do respectivo item
- Observações por item e gerais, quando informadas
- Forma de pagamento

## Regras de legibilidade

- Itens em destaque
- Observações sempre depois do item
- Adicionais sempre prefixados por `+`, preservando o nome congelado na venda
- Separação clara entre dados do cliente e preparo
- Texto simples e de leitura rápida
- **Trava:** retries do mesmo job devem reutilizar o mesmo arquivo de spool

## Itens de entrega direta

Cada item congela no pedido o modo `kitchen` ou `direct_handoff`. O ticket
continua único por pedido/rodada e separa, quando existirem, os blocos:

- `PREPARO COZINHA` — itens que precisam ser preparados
- `ENTREGA DIRETA — NÃO PREPARAR` — bebidas e itens de Bomboniere

Bebidas e itens de Bomboniere **não criam fila, ticket ou status de produção
paralelos** — orientam atendimento, tele e garçom.

- **Trava:** o nome canônico é `Bomboniere`; a variação `bombournie` não é
  adotada.
- Pedido com somente entrega direta: persiste e imprime normalmente, avança de
  `confirmed` para `ready` na mesma operação.
- Em pedido misto: o status de preparo representa somente o trabalho da
  cozinha.

## Ticket corretivo

Item já enviado **nunca é apagado ou reimpresso como se fosse novo**. O
cancelamento gera ticket separado com:

- `CANCELAMENTO / RETIRAR`
- Comanda, nova rodada e referência curta ao pedido original
- Quantidades canceladas e motivo

O ticket original permanece imutável.

- Cancelamento com itens de entrega direta marca essas linhas como
  `CANCELAR ENTREGA DIRETA — NÃO RETIRAR DA COZINHA`.
- Se não houver item de cozinha, o cabeçalho usa `CANCELAMENTO / ENTREGA DIRETA`.

---

# Guia de desenvolvimento

## Transporte de impressão

Fluxo canônico: domínio → `print_jobs` → API → bridge → spool.

1. O domínio gera o texto canônico.
2. A API persiste um `print_job` na **mesma transação** do pedido/estoque.
3. O `print_job` é enviado ao `print-bridge` autenticado.
4. O bridge grava uma única entrada de spool por `jobId`.
5. Retry reutiliza o ID e nunca sobrescreve conteúdo existente.

- **Trava:** o frontend não imprime ticket de cozinha em paralelo.
  `window.print()` permanece apenas para relatório gerencial de turno.
- **Trava:** vincular um pedido a comanda não gera nem altera ticket.
- **Trava:** toda reimpressão copia o conteúdo do `print_job` original; nunca
  reconstrói o texto a partir do estado atual do pedido.

## Limite, dead-letter e recibo

- Payload HTTP: limite de 64 KiB em UTF-8; recusado antes da persistência se
  exceder — conteúdo nunca é truncado.
- Fila de estados: `pending → sending → retry_wait → printed → dead_letter`.
- Máximo cinco tentativas com backoff e reprocessamento unitário autorizado.
- O mesmo `jobId` é preservado na reconciliação.
- O bridge responde `already_printed` para repetição idêntica.
- **Trava:** `printed` comprova gravação no spool, não impressão física — o
  hardware não fornece recibo ou deduplicação verificável.

## PII e retenção do spool

- Diretório de spool é privado ao processo, não publicado como arquivo e exige
  autenticação para consulta ou alteração.
- Nomes de arquivo usam somente IDs validados.
- Retenção operacional recomendada: máximo 30 dias.
- A rotina LGPD sobrescreve imediatamente os artefatos relacionados por um
  marcador anonimizado.
- Backups continuam sujeitos à retenção declarada pelo provedor.

## Bridge em nuvem vs. impressão local

O bridge hospedado no Render **não imprime na cozinha local** — apenas grava em
filesystem efêmero do serviço. Impressão térmica física exige agente local
seguro ou integração ESC/POS aprovada. Ver gate em
[deploy-e-infraestrutura.md](deploy-e-infraestrutura.md).

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[ciclo-do-pedido.md](ciclo-do-pedido.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[deploy-e-infraestrutura.md](deploy-e-infraestrutura.md)
