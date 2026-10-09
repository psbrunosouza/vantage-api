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

- Feature nova ou alterada → criar testes.
- Meta: cobertura ≥ 80%.
- Sem backfill em massa. Código existente sem teste → cobrir à medida que a necessidade aparecer.

## Execução

- Não rodar build, lint, test, serve, Docker, request HTTP, screenshot ou browser sem pedido explícito.
- Implementar e parar. Usuário valida.

## Git

- Branch de trabalho: `develop`.
- Cada feature solicitada → commit + push para `develop`.
- Commit sem `Co-Authored-By` do Claude nem qualquer atribuição ao Claude.
