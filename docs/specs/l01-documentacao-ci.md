# L-01: Alinhar README, segurança e resultados de CI ao estado atual

## Problema e Evidências
1. O README atualmente possui um bloco legado (snapshot estático da auditoria) que crava testes fixos (`36/36`) e afirma erroneamente "Não há login/identidade de operador".
2. O código de fato já evoluiu para contar com sessão persistida, RBAC (`admin`, `operator`, `kitchen`), limitação estrita por CSRF e Rate Limits de segurança nativos.
3. Não há uma referência visual rastreável para comprovar o status real do CI (GitHub Actions).

## Comportamento Atual e Desejado
- **Atual**: O arquivo afirma limitações irreais de segurança e mascara a execução do CI com uma tabela fixa de um auditor de 2026-07-21.
- **Desejado**: O README reflete com exatidão a camada de segurança atual (Sessões baseadas em tokens, CSRF seguro, rate-limit), omite contagens codificadas de testes e em vez disso integra a [Badge de CI] do GitHub Actions para observabilidade real. A diferenciação clara entre "validado localmente", "aprovado no CI" e "não homologado" será mantida.

## Invariantes de Domínio e Segurança
- O README é a porta de entrada e deve ser absolutamente transparente sobre o que é seguro expor (ainda não homologados `iFood`/`Delivery Much` com senhas reais). Comandos de exemplo não exporão caminhos pessoais locais (`/mnt/c/Users/...`).

## Estados e Transições Afetados
- Nenhum runtime backend será afetado. Trata-se puramente da visibilidade e observabilidade da arquitetura perante operadores.

## Contratos HTTP e de Persistência Afetados
- N/A.

## Estratégia de Migração e Compatibilidade
- Limpeza e revisão estrutural do `README.md`.

## Arquivos e Símbolos Prováveis
- `README.md`: Remoção da seção estática "Snapshot desta auditoria" e da limitação fictícia de auth. Refinamento de comandos.

## Testes Unitários, de Integração e Regressão
- Utilizaremos os linters já integrados (`npm run check`, Markdown links linter).

## Observabilidade e Mensagens de Erro
- Badge do GitHub Actions implantado e funcionando com o `ci.yml`.

## Riscos, Rollback e Fora de Escopo
- **Risco**: Quebra de formatação de tabelas, links quebrados.
- **Fora do escopo**: Mudar o arquivo de workflow `ci.yml` internamente (já atende), focar no README.

## Critérios de Aceitação Verificáveis
1. O README NÃO diz que não há login. Pelo contrário, detalha a autenticação.
2. Contagem `36/36` removida.
3. Contém link para Actions (`ci.yml`).
4. Sem caminhos do autor no quickstart (`/mnt/c/...`).
5. Limitações de iFood/Delivery Much explícitas.

## Autoavaliação e melhoria iterativa

| Critério | Pontos | Como será medido |
|---|---:|:---|
| Correção funcional e preservação dos invariantes | 30 | O README descreverá com precisão que há login (sessão, CSRF, RBAC). |
| Testes de regressão, integração e casos-limite | 20 | Testes e lint rodarão normalmente após a alteração do README sem erros residuais de sintaxe. |
| Segurança, integridade transacional e concorrência | 15 | Remoção de paths expostos e documentação transparente sobre as credenciais de DB/App. |
| Aderência integral à especificação | 15 | Cumprimento de 100% dos requisitos do prompt na reformulação textual. |
| Qualidade de código, clareza e manutenibilidade | 10 | Uso adequado de markdown, badge formatado, formatação coesa. |
| Operação, observabilidade, documentação e rollback | 5 | Informação fidedigna sobre o CI e links operantes. |
| Disciplina de escopo, commit e reprodutibilidade | 5 | Branch restrita a documentação (docs: commit). |
