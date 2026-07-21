# Auditoria commit a commit

Data da revisão: 2026-07-21. Universo: `git log --all`, 82 commits; 77 alcançáveis pelo `HEAD` `5c45a5c` e 5 somente em refs laterais. A análise combinou parentage, estatística, diff dos commits de risco, estado resultante e execução do código. “Corrigido” significa corrigido no working tree desta auditoria, ainda sem commit/deploy.

## Fundação — 14 a 17 de julho

| # | Commit | Mudança | Auditoria e destino |
|---:|---|---|---|
| 1 | `3dd601b` | Inicialização do repositório | Base vazia/administrativa. Sem achado funcional isolado. |
| 2 | `bdd41dd` | Demo operacional completa | Criou 84 arquivos e 13.859 linhas de uma vez. Entregou a base funcional, mas o tamanho prejudicou revisão e concentrou API/UI; dívida permanece. |
| 3 | `9174d61` | Descontos por item e pedido | Regra útil preservada. Validação de 0–100 e ordem dos descontos continuam testadas. |
| 4 | `4be9594` | Guia de desenvolvimento e 5W2H | Instituiu governança, porém houve grande churn documental. Guia foi atualizado nesta auditoria para refletir os gates reais. |
| 5 | `cdeeabd` | Snapshot OlaClick 2026-07-16 | Fonte versionada e reproduzível. Continua válida como snapshot, não como catálogo online. |
| 6 | `5b00ef8` | Adicionais configuráveis | Modelo snapshot por linha foi preservado. Testes protegem duplicata, elegibilidade, preço e ticket. |
| 7 | `558ac72` | Comandas livres e rodadas | Boa consolidação: `service_tabs` comercial e `orders` operacional. Preservada. |
| 8 | `3d1125d` | Rodadas e tickets corretivos | Correção compensatória em vez de reescrita do ticket. Preservada e documentada. |
| 9 | `ea00965` | Estoque transacional | Regra forte, mas 3.701 adições/6.651 remoções indicam reescrita excessiva. Locks/rollback foram validados no smoke. |
| 10 | `38b122a` | Pagamentos múltiplos | Modelo em centavos e estornos é sólido; 8.087 adições/3.272 remoções novamente reduziram auditabilidade. Preservado. |
| 11 | `82019fc` | Sangria e filtros financeiros | Corrigiu semântica de faturamento e unificou filtro/lista/resumo. Preservado. |
| 12 | `b901fd4` | Consolidação de QA/release | Evidência era válida para aquele baseline. O “sem P0/P1” não podia cobrir integrações adicionadas depois; relatório antigo foi supersedido. |

## Refs documentais laterais — 18 de julho

| # | Commit | Mudança | Auditoria e destino |
|---:|---|---|---|
| 13 | `0dd5d69` | PRs passam a usar `main` | Documento coerente, mas commit não está no `HEAD`. Conteúdo deve ser reaplicado apenas se ainda desejado. |
| 14 | `6a75cc6` | Relatório alinhado à `main` | Ajuste de uma linha, fora do `HEAD`; sem efeito no produto publicado. |
| 15 | `cc0bfd5` | Remove dependência de PRs empilhadas | Correção de processo sensata, fora do `HEAD`; o novo guia já recomenda mudanças pequenas e independentes. |

## Integrações e demo — 20 de julho

| # | Commit | Mudança | Auditoria e destino |
|---:|---|---|---|
| 16 | `83a137a` | Proposta de venda e deploy | Material comercial misturou demo e produção. Foi reclassificado: integração real e produção continuam bloqueadas. |
| 17 | `02492d9` | Contrato e persistência dos canais | Boa fundação (`channel_mappings/events/commands`), porém sem constraints fortes de status/ação e sem migrations versionadas. Mantido com dívida. |
| 18 | `e0362f4` | Ingestão e rotas de integração | Introduziu 447 linhas sem testes. O pedido normalizado era incompleto e as rotas buscavam `db/sse` não decorados no Fastify. Corrigido e testado. |
| 19 | `181d2eb` | Adapter Delivery Much | Autenticação e comandos iniciais, mas deduplicação usava UUID novo a cada poll, token não expirava e ações desconhecidas eram concluídas. Corrigido; rotas reais ainda exigem contrato privado. |
| 20 | `4582cbb` | Adapter iFood | Maior regressão de integração: endpoint híbrido, ausência de header merchant, ACK pré-commit, transação aninhada e intervalo incorreto. Fluxo refeito; sandbox ainda obrigatório. |
| 21 | `1da343b` | UI premium/fila de autorização | Conceito operacional correto: externo entra em `received`. Parte do fluxo acionava backend defeituoso; agora usa chave estável e adapters. |
| 22 | `bf49c37` | Seed de demonstração | Seed era destrutivo, não atômico e registrava R$ 15.000,00 em vez de R$ 150,00. Corrigido, protegido e provado. |
| 23 | `0bd5e05` | “Fix circular dependency” | Anexou funções ao objeto DB e resolveu o boot parcial, mas não corrigiu injeção das rotas nem objeto de ingestão. Correção atual completa o caminho. |
| 24 | `1728360` | Merge PR #1 | Merge sem lógica própria; propagou `0bd5e05` e suas limitações. |
| 25 | `544287b` | Merge PR #2 | Merge do simulador; sem lógica própria. |
| 26 | `6186a90` | Simulador e ajuste de seed | Útil para demo, mas mantinha dados antigos e pouca validação de resposta. Seed foi substituído por cenário coerente e smoke permanece fonte E2E. |
| 27 | `00c0976` | Merge PR #3 | Merge de UI; sem lógica própria. |
| 28 | `5e26b9e` | Redesign da aba de pedidos | Mudança visual pequena e preservada; risco principal era ausência de validação visual automatizada. |
| 29 | `a9fee29` | Merge PR #4 | Merge da impressão client-side; propagou duplicidade de impressão. |
| 30 | `fd18578` | Mock de print bridge no frontend | Criou segundo caminho de ticket, duplicou jobs do backend e interpolou dados sem escape. Caminho de cozinha foi removido do navegador. |
| 31 | `f2dc9b6` | Merge PR #5 | Merge do relatório de caixa; sem lógica própria. |
| 32 | `e7fd889` | Impressão de fechamento | Relatório financeiro client-side é aceitável para a demo. Escape de label/método foi mantido/corrigido. |
| 33 | `32ed129` | Merge PR #6 | Merge de teste; sem lógica própria. |
| 34 | `e5d1e20` | Ajuste de asserção por emoji | Correção frágil de apresentação, sem impacto de domínio. Suíte atual não depende da impressão de cozinha client-side. |
| 35 | `6dab198` | Merge PR #7 | Merge das correções de UI; sem lógica própria. |
| 36 | `702249f` | Botões de integração e responsividade | Melhorou UI, mas não alcançou os defeitos server-side do adapter. Fluxo backend/frontend foi corrigido agora. |
| 37 | `ea7574f` | Merge PR #8 | Merge de endereço/OlaClick; sem lógica própria. |
| 38 | `2862510` | Endereço no ticket e OlaClick manual | Endereço em delivery está correto e o canal manual é compatível com o núcleo único. Preservado no ticket server-side. |
| 39 | `ca242eb` | Merge PR #9 | Merge documental; sem lógica própria. |
| 40 | `032525a` | Documenta integração/UI/print | Registrou como entregue um caminho client-side que conflitava com o spool. Documentação corrigida. |
| 41 | `6b53e06` | Merge PR #10 | Merge do roteiro de produção; sem lógica própria. |
| 42 | `ffc2393` | Roteiro fase 2 | Tinha endpoints iFood incorretos e prescrevia filas/Redis/Kubernetes sem evidência de necessidade. Foi substituído por gates incrementais. |
| 43 | `2b193e2` | Variáveis do relatório de caixa | Correção pontual válida; coberta pelo smoke financeiro. |
| 44 | `5af8e52` | Merge PR #11 | Merge da correção de relatório; sem lógica própria. |
| 45 | `09e6cee` | Merge PR #12 | Merge de estilo; sem lógica própria. |
| 46 | `4918dfb` | Paleta Dark Brown POS | Mudança visual, sem regressão estrutural encontrada. |
| 47 | `c2e3399` | Merge PR #13 | Merge de layout; sem lógica própria. |
| 48 | `d224595` | Layout da fila de autorização | Resolveu conflito visual, conceito preservado. |
| 49 | `a655d47` | Abas/modal de cardápio | Simplificou uso do catálogo, mas aumentou `main.js`; dívida de modularização permanece. |
| 50 | `9a3ea80` | Merge PR #14 | Merge do cardápio; sem lógica própria. |
| 51 | `24da310` | Merge PR #15 | Merge de “segurança/LGPD”; propagou rota destrutiva sem auth. |
| 52 | `6ab3261` | Helmet, rate limit e anonimização | Headers/rate limit foram positivos; CORS permissivo e anonimização pública eram críticos. CORS restringido e rota protegida. |
| 53 | `ea7238b` | Remove `Object.groupBy` | Boa compatibilidade sem dependência. Preservada. |
| 54 | `60a3a7e` | Cache bust do JS | Workaround pontual. O Render agora aplica `no-store`; ideal futuro é asset com hash. |
| 55 | `dd5fca6` | Novo fluxo por modais | Fluxo útil, mas o merge posterior produziu duplicação de handlers. Duplicação removida. |

## Linhagem lateral de UI não incorporada

| # | Commit | Mudança | Auditoria e destino |
|---:|---|---|---|
| 56 | `3487db7` | Refatoração completa UI/LGPD/docs | Fora do `HEAD`. O diff de 102 arquivos e ~41 mil linhas é majoritariamente regravação/EOL e apagamento documental; não é uma unidade revisável nem deve ser “recuperado” em bloco. |
| 57 | `58fc56b` | Corrige tabs/event delegation na ref lateral | Fora do `HEAD`. A correção equivalente já existe na linhagem ativa; não fazer cherry-pick sem comparação semântica. |

## Merge de comandas e estabilização — 21 de julho

| # | Commit | Mudança | Auditoria e destino |
|---:|---|---|---|
| 58 | `384a10f` | Fluxo contínuo de comandas/desconto | Feature válida criada a partir de outra base. O merge seguinte exigia revisão cuidadosa. |
| 59 | `8bcab6d` | Merge manual de conflitos | Regressão: deixou marcador literal `>>>>>>>` e blocos duplicados no JavaScript. É o principal exemplo de merge sem gate sintático. CI agora impediria. |
| 60 | `61ee2f5` | Ordenação de pedidos | Regra visual simples e válida. |
| 61 | `6661297` | Rate limit 1000/min | Evitou fricção da demo, mas não é controle de abuso por identidade nem proteção de produção. Mantido como limite de demo. |
| 62 | `344d87e` | Remove marcadores/renderização | Removeu o marcador e parte do dano, mas deixou handlers de integração/configuração duplicados. Correção atual removeu o restante. |
| 63 | `5276954` | Documentação central e Blueprint | Blueprint útil, mas segurança/deploy foram descritos como mais maduros do que o código. Blueprint e docs foram corrigidos. |
| 64 | `f5d44ad` | Corrige posição `databases` no Render | Correção YAML válida. |
| 65 | `4e6bbe4` | Auto-seed no Render | Regressão de boot: importou script não copiado pela imagem; default também efetivamente ativava seed. Dockerfile/default corrigidos. |
| 66 | `aac6e03` | GET/HEAD de health na raiz | Adição pequena; HEAD explícito era redundante. |
| 67 | `bee1646` | Remove HEAD duplicado | Correção apropriada para o comportamento automático do Fastify. |
| 68 | `9aae1fb` | URL da API no Render | Primeira correção do roteamento do frontend, ainda seguida por ajuste. |
| 69 | `3fb67d4` | Subdomínio `ops-web` → `api` | Resolveu a URL atual por convenção de nomes. Continua acoplada ao hostname; aceitável para a demo. |
| 70 | `1bb0752` | README/docs/5W2H/guia IA/Render | Grande atualização documental, porém congelou números de teste e alegações incorretas de produção, CORS e impressão. Reescrita nesta auditoria. |
| 71 | `ccc816f` | Atualiza Graphify e script WSL | Mapa útil, mas 3.317 adições/9.372 remoções geram ruído e a consulta mostrou colisão de `server.js`. Grafo deve ser pista, não prova. |
| 72 | `6e6b2d9` | Redesign POS e modais | Mudança ampla de UI sem novo domínio. Suíte responsiva atual passou; modularização segue pendente. |
| 73 | `e172bfe` | Formulários nos modais | Reduziu navegação e preservou endpoints. Válido. |
| 74 | `8a1a7c1` | Pedido em modal | Fluxo válido; carrinho só é limpo após sucesso. |
| 75 | `69c446f` | Vincular/criar comanda no pedido | Reutiliza o agregado correto, sem criar segundo núcleo. Válido. |
| 76 | `a6bb648` | Troco no pedido em dinheiro | Cálculo de apresentação; API continua fonte de verdade. Válido. |
| 77 | `1bd28c8` | Responsividade do carrinho | Corrigiu overflow; teste CSS continua verde. |
| 78 | `38cc0d0` | Troco na parcela da comanda | Cálculo local sem alterar valor persistido. Válido. |
| 79 | `199ab9b` | Remove botão “lançar itens” | Simplificação de UI coerente com fluxo pelo modal. |
| 80 | `b5581df` | Resumo operacional minimalista | Mudança visual válida. |
| 81 | `1f99625` | Estoque de pães no painel | O rótulo visual não cria nova categoria de estoque; a v1 ainda controla apenas `xis`, `dog`, `hamburguer`. Documentar para não sugerir ingrediente/CMV. |
| 82 | `5c45a5c` | Modal após criar comanda | Ajuste final pequeno e coerente; era o `HEAD` auditado. |

## Padrões históricos encontrados

- Commits pequenos de domínio acompanhados de teste tiveram melhor sobrevivência.
- Grandes regravações (`ea00965`, `38b122a`, `3487db7`, `ccc816f`) esconderam intenção e aumentaram custo de revisão.
- A sequência de merges 1–15 integrou rapidamente UI/documentação, mas quase nunca acrescentou teste de contrato para as integrações.
- Mensagens “security”, “production” e “release” não equivaleram a gates reais; o deploy público continuou sem autenticação e com bugs observáveis.
- O merge `8bcab6d` teria sido bloqueado por um simples `node --check`; por isso o gate agora faz parte da CI.
- Cinco commits laterais não fazem parte do produto atual. Auditorias futuras devem usar `--all` e também distinguir o que alcança o `HEAD`.
