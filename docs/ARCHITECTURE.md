# Vantage Backend — Arquitetura

API do Vantage. Consumida por `frontend/` via proxy `/api/*`.

## Stack

- Node 26, npm.
- NestJS 12, TypeScript 6, ESM.
- PostgreSQL 18 + Drizzle ORM (`pg`).
- Validação: Zod via `drizzle-zod`. Sem class-validator.
- Swagger via `@nestjs/swagger`.
- Vitest.
- ESLint + Prettier.
- Docker Compose (dev): API com hot reload (bind mount, `node_modules` em volume) + Postgres.
- Dockerfile: stage `dev` (compose) e `production` (final).
- Auth: Better Auth + `@thallesp/nestjs-better-auth`. Sessão em banco + cookie.
- Arquivos: Supabase Storage (só storage) via `@supabase/supabase-js`, secret key no backend.
- Sem realtime até precisar. Realtime → gateway WebSocket do Nest.

## Repo

```text
src/
  main.ts                 bootstrap
  app.module.ts           módulo raiz
  env.ts                  schema Zod do env
  database/               DatabaseModule global, token DATABASE
  auth/                   instância Better Auth + tabelas de auth
  storage/                StorageModule global: ImageStorageService, ImageUpload (Supabase Storage)
  common/                 código compartilhado entre domínios (ZodValidationPipe)
  <domínio>/
    <domínio>.module.ts
    <domínio>.controller.ts
    <domínio>.service.ts
    <domínio>.schema.ts   tabelas Drizzle
    dto/
drizzle/                  migrations geradas
drizzle.config.ts
Dockerfile
docker-compose.yml
docs                      PRODUCT.md, ARCHITECTURE.md
```

- Padrão Nest CLI: um módulo por domínio (`nest g resource`).
- ESM: import relativo com `.js`.
- Body validado com `ZodValidationPipe` + schema `drizzle-zod` em `dto/`. Param uuid → `ParseUUIDPipe`.
- Env validado em `env.ts`. Leitura via `ConfigService<Env, true>`.
- Banco: injetar `DATABASE` (cliente Drizzle).
- Imagem: injetar `ImageStorageService`; rota com `@ImageUpload()`. Upload passa pelo backend; front nunca fala direto com o Supabase.
- Prefixo global `/api`.
- Toda rota exige sessão (guard global). Pública → `@AllowAnonymous()`. Sessão → `@Session()`.
- Promover código compartilhado na segunda duplicação.
- Sem pasta vazia.

## Dados

- Fixo (sistema, mesa, usuário, ids, relações) → colunas.
- Definido pelo usuário (peças e layout da estrutura, valores do recurso) → `jsonb`.
- Valores do recurso validados por Zod montado em runtime a partir da estrutura.
- Migrations: `drizzle-kit generate` + `migrate`, versionadas. `push` só local.

## Auth

- Better Auth em `/api/auth/*`, fora dos controllers. Plugin `openAPI` gera doc das rotas; `main.ts` mescla no Swagger.
- `TRUSTED_ORIGINS`: origens extras aceitas pelo Better Auth (dev: Swagger em `localhost:3000`).
- Login: Google, Discord, email/senha.
- Email/senha exige email verificado. Envio via Resend.
- Cadastro com email existente → `422 USER_ALREADY_EXISTS` (hook `before` em `auth.ts`). Sem ele, Better Auth responde sucesso genérico e não envia email.
- `users` = pessoa. `accounts` = forma de login (1 por provedor). `sessions`, `verifications`.
- Mesmo email verificado em outro provedor → mesma `users`.
- `users.role`: `COMMON` (padrão) | `SYSTEM`. `SYSTEM` só via seed (`src/database/seed.ts`). Nenhuma rota altera `role` (`input: false`).

## Imagens

- `ImageStorageService.replace(bucket, pasta, arquivo, persist?)`: sobe, persiste URL, apaga anteriores da pasta. PNG, JPEG ou WebP, até 2 MB.
- Bucket `avatars`: usuário em `<userId>/` (`POST /api/avatar`), journey em `journeys/<journeyId>/` (`POST /api/journeys/:id/avatar`).
- Bucket `images`: field image em `<journeyId>/<resourceId>/<fieldId>/`. Upload só devolve URL; valor salvo pelo autosave do resource.

## Journeys

- `journeys` = Journey (conceito do produto). Dono em `owner_id`.
- `journey_members` = participantes (sem o dono). PK `(journey_id, user_id)`.
- Usuário vê journey se é dono ou participante. Fora disso → `404`.
- `PATCH`/`DELETE`/`POST :id/avatar` só dono. Participante → `403`.
- Entrada de participante: ainda não existe.

## Structures

- `structures` = modelo. Pertence a uma journey (`journey_id`, cascade). Fields em `fields` (`jsonb`): tipo, label, posição no grid, options e config. Compartilhado por todos os resources dela.
- Rotas em `/api/journeys/:journeyId/structures`. Leitura: quem vê a journey. Escrita: só dono.
- `fields`: Zod valida só campos base (`id`, `type`, `label`, `column`, `row`, `span`, `rows`, `options`). Config de cada tipo passa sem checagem.
- Remover field → mesma transação apaga o valor dele em todos os resources da structure.

## Resources

- `resources` = objeto real. Pertence a uma structure (`structure_id`, cascade). Valores em `values` (`jsonb`), chave = id do field.
- Rotas: `GET /api/journeys/:journeyId/resources`, `POST /api/journeys/:journeyId/structures/:structureId/resources`, `PATCH /api/journeys/:journeyId/resources/:id`, `POST /api/journeys/:journeyId/resources/:id/fields/:fieldId/image`.
- Leitura: quem vê a journey. Escrita: só dono.
- `values` validado por Zod montado dos fields da structure (`resource-values.ts`, tipo por `type`). Chave de field inexistente ou sem valor (section, separator) é descartada. `PATCH` substitui `values` inteiro.

## Links

- `links` = célula de coluna Relation de uma table. Uma linha por target: `source_id` (resource dono da table), `field_id`, `row_id`, `column_id`, `target_id`. FKs em `resources`, cascade.
- Linhas e células próprias da table seguem em `values`. Célula Relation vive só em `links`.
- Coluna Relation (config em `fields`): `relation.structureId`, `targets` (`one` = 1 por célula) e `sources` (`one` = target em 1 célula só, entre todos os resources).
- Rotas: `GET /api/journeys/:journeyId/links` (todos da journey), `PUT /api/journeys/:journeyId/resources/:id/links` (`{ fieldId, rowId, columnId, targetIds }` substitui a célula). Leitura: quem vê a journey. Escrita: só dono.
- `PUT` valida coluna Relation, linha existente em `values`, target na structure da coluna e na journey, cardinalidade (`400`/`409`).
- Limpeza na mesma transação: `PATCH` de `values` apaga links de linha removida; `PATCH` de `fields` apaga links de coluna Relation removida ou com target trocado.

## Contrato

- No backend: auth, avatar, journeys, structures, resources, links.
- Resto: frontend usa `frontend/mock-api/db.json` (json-server).
- Coleções e regras de dados → `frontend/docs/ARCHITECTURE.md`, seção Dados.
