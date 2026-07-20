# 🍔 Camoburguer
> **O coração digital da sua hamburgueria: ágil, resiliente e feito para crescer.**

O **Camoburguer** não é apenas um sistema de caixa. É uma plataforma operacional completa desenhada para centralizar pedidos, acabar com o caos na cozinha e dar total visibilidade financeira ao seu negócio. Seja atendendo no balcão, via WhatsApp ou integrado a aplicativos de delivery, sua equipe trabalha em uma única tela, sem estresse.

## 🚀 Por que escolher o Camoburguer?

- **Gestão Unificada de Pedidos**: Chega de tablets apitando de todos os lados. Centralize Balcão, WhatsApp, iFood e Delivery Much em uma única fila de autorização.
- **Cozinha Sem Papel Perdido**: Cada pedido confirmado é enviado automaticamente para impressão na cozinha com um ticket padronizado. Com recuperação automática de falhas, nenhum pedido é esquecido se a impressora acabar o papel.
- **Controle de Comandas e Mesas**: Atenda o salão com comandas livres. Adicione rodadas ao longo da noite, receba pagamentos parciais (Dinheiro, Pix, Cartões) e acompanhe o saldo exato, centavo por centavo.
- **Estoque Transacional Inteligente**: Xis, Dogs e Hambúrgueres controlados em tempo real. A baixa só ocorre quando o pedido é confirmado. Se houver cancelamento, o sistema devolve o item automaticamente.
- **Caixa Blindado e Financeiro Transparente**: Abertura, reforço, sangria e fechamento seguros. Histórico imutável de entradas e saídas, sem possibilidade de fraude ou edição não rastreável.
- **Ultra Leve e Veloz**: Uma interface moderna, sem atrasos, que funciona perfeitamente em telas touch, tablets e computadores antigos. 

---

## 🛠 Arquitetura de Alto Desempenho

Construído sob o rigor da engenharia moderna e a doutrina *Ponytail Full* (menor solução correta):
- **Core Imutável**: Pedidos são auditáveis. Cancelamentos geram registros reversos, nunca apagando o histórico real.
- **Eventos em Tempo Real (SSE)**: Quando o salão fecha uma comanda, a cozinha sabe na hora. Sem "atualizar a página".
- **Integração Segura**: Os pedidos externos ficam em estado `received` (aguardando) até a aprovação humana. Somente após a aceitação o estoque é afetado e a cozinha notificada.
- **Idempotência Garantida**: Clique duplo no botão de pagar? A rede caiu no meio do fechamento? O Camoburguer usa chaves idempotentes para garantir que cobranças ou pedidos nunca sejam duplicados.

---

## ⚙️ Experimente Agora (Modo Demo)

A demonstração sobe todo o ecossistema localmente usando Docker.

**Pré-requisitos**: Docker Desktop (com WSL ativo), Node.js 24+ e npm.

```powershell
rtk wsl.exe -d Ubuntu -- docker compose up -d --build
```

### Acessos:
- **Terminal do Operador**: [http://127.0.0.1:8081](http://127.0.0.1:8081)
- **API Core**: [http://127.0.0.1:3001/health](http://127.0.0.1:3001/health)
- **Serviço de Impressão (Bridge)**: [http://127.0.0.1:3100/health](http://127.0.0.1:3100/health)

> **💡 Dica**: Execute `rtk npm run smoke` para disparar uma bateria de testes end-to-end que cria pedidos, opera comandas, envia para a cozinha, fecha o caixa e valida todas as travas financeiras do sistema.

---

## 📚 Documentação Técnica e Deploy

Toda a lógica e fluxos estão detalhadamente documentados. Nenhum dado pessoal ou caminho absoluto é mantido no repositório por questões estritas de segurança.

- [Ciclo do Pedido](docs/ciclo-do-pedido.md)
- [Arquitetura do Sistema](docs/arquitetura-do-sistema.md)
- [Controle de Estoque](docs/estoque.md)
- [Pagamentos e Comandas](docs/pagamentos-comandas.md)
- [Guia de Deploy no Render](docs/RENDER_DEPLOY.md)

---
*Camoburguer: A essência da operação gastronômica moderna.*
