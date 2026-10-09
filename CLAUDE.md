# Vantage Backend — Regras

## Contexto

- Produto → `docs/PRODUCT.md`
- Arquitetura → `docs/ARCHITECTURE.md`
- Leia apenas o necessário para a tarefa.
- Cada fato vive em um único arquivo. Não duplicar.

## Escrita

- Caveman lossless: curto, telegráfico, sem perder informação.
- Sem floreio, preâmbulo, óbvio ou repetição.
- Primeiro pedido da sessão → invocar skill `caveman`. Estilo persiste na sessão; não reinvocar a cada pedido.

## Código

- Zero comentários no código.
- Código autoexplicativo.
- Não inventar decisão, convenção ou abstração.
- Ambiguidade relevante → perguntar antes de implementar.
- Tabela nova ou alterada → apresentar modelo (tabelas, colunas, relações) e esperar aprovação antes de implementar.

## Testes

- Spec por feature: regra de service ou feature que pode quebrar fluxo.
- Não criar spec pra código trivial ou aleatório.
- Feature nova ou alterada → criar ou atualizar spec dela.
- Antes de fechar tarefa → checar se feature tocada tem spec. Faltou → criar.
- Escopo = código da tarefa. Não retestar o sistema inteiro.
- Sem backfill em massa.

## Execução

- Não rodar build, lint, test, serve, Docker, request HTTP, screenshot ou browser sem pedido explícito.
- Implementar e parar. Usuário valida.

## Git

- Branch de trabalho: `develop`.
- Cada feature solicitada → commit + push para `develop`.
- Commit sem `Co-Authored-By` do Claude nem qualquer atribuição ao Claude.
