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
- IA: OpenRouter via `fetch` (`ai/openrouter.client.ts`). Token do próprio usuário.

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
- `journey_members` = pessoas da journey, dono incluso (entra na criação). PK `(journey_id, user_id)`. `color` = hue sorteada ao entrar (`pickMemberColor`, prioriza livres entre as 8 de `member-colors.ts`).
- Usuário vê journey se é dono ou participante. Fora disso → `404`.
- `PATCH`/`DELETE`/`POST :id/avatar` só dono. Participante → `403`.
- `journeys.narrator_id` = único narrador (coluna única garante 1). Nasce = dono. `PATCH` com `narratorId` (só dono): precisa estar em `journey_members`, senão `400`; `null` = sem narrador.
- `journeys.ai_narrator` = a IA narra (paga com a key do dono). `PATCH` com `aiNarrator: true` zera `narrator_id`; `narratorId` preenchido desliga `ai_narrator`; os dois juntos → `400`.
- Entrada de participante: ainda não existe.

## Structures

- `structures` = modelo. Pertence a uma journey (`journey_id`, cascade). Fields em `fields` (`jsonb`): tipo, label, posição no grid, options e config. Compartilhado por todos os resources dela.
- Rotas em `/api/journeys/:journeyId/structures`. Leitura: quem vê a journey. Escrita: só dono.
- `capability` (`text`, `STRUCTURE_CAPABILITIES`: `actor`; `null` = nenhuma). Structure `actor` = fichas jogáveis da journey; todas as fichas dela são actors. Máximo 1 por journey (`structures_actor_unique`, índice único parcial). `POST`/`PATCH` com `actor` tira a marca da anterior na mesma transação; sair de `actor` remove o controle (`member_resources`) das fichas dela.
- `fields`: Zod valida só campos base (`id`, `type`, `label`, `column`, `row`, `span`, `rows`, `options`). Config de cada tipo passa sem checagem.
- `PATCH` de `fields` não apaga nada: permite undo/redo no edit do front.
- `POST /api/journeys/:journeyId/structures/:id/prune` (só dono, `204`): apaga dos resources da structure valores de field inexistente e links de field/coluna removida ou com target trocado. Front chama ao sair do edit.

## Resources

- `resources` = objeto real. Pertence a uma structure (`structure_id`, cascade). Valores em `values` (`jsonb`), chave = id do field.
- Rotas: `GET /api/journeys/:journeyId/resources`, `POST /api/journeys/:journeyId/structures/:structureId/resources`, `PATCH /api/journeys/:journeyId/resources/:id`, `POST /api/journeys/:journeyId/resources/:id/fields/:fieldId/image`.
- Leitura: quem vê a journey. Criar: só dono. `PATCH` e imagem: dono ou quem controla a ficha (`MembersService.ensureEditor`).
- `values` validado por Zod montado dos fields da structure (`resource-values.ts`, tipo por `type`). Chave de field inexistente ou sem valor (section, separator) é descartada. `PATCH` substitui `values` inteiro.

## Links

- `links` = seleção de Relation. Uma linha por target: `source_id` (resource dono), `field_id`, `row_id`, `column_id`, `target_id`. FKs em `resources`, cascade. Unique com `NULLS NOT DISTINCT`.
- Célula Relation de table: `row_id` + `column_id` preenchidos. Linhas e células próprias da table seguem em `values`; célula Relation vive só em `links`.
- Coluna Relation (config em `fields`): `relation.structureId`, `targets` (`one` = 1 por célula) e `sources` (`one` = target em 1 célula só, entre todos os resources).
- Choice/boxes em modo relation (config `chips.relation.structureId`): `row_id` e `column_id` nulos. Seleção vive só em `links`. Choice = 1 target, boxes = vários. Sem restrição de `sources`.
- Rotas: `GET /api/journeys/:journeyId/links` (todos da journey), `PUT /api/journeys/:journeyId/resources/:id/links` (`{ fieldId, rowId, columnId, targetIds }` substitui a seleção; `rowId`/`columnId` juntos, ambos `null` para choice/boxes). Leitura: quem vê a journey. Escrita: dono ou quem controla o resource de origem.
- `PUT` valida relation existente, linha existente em `values` (table), target na structure da relation e na journey, cardinalidade (`400`/`409`).
- Limpeza: `PATCH` de `values` apaga, na mesma transação, links de linha removida (só tables existentes na structure). Links de field/coluna removida ou com target trocado saem no `prune` da structure.

## Members

- `member_resources` = fichas que cada pessoa controla. PK `resource_id` (1 ficha = 1 pessoa). FK `(journey_id, user_id)` → `journey_members` (`member_resources_member_fk`, cascade); `resource_id` → `resources` (cascade). Só fichas da structure `actor` (`PUT` com outra → `400`).
- Rotas em `/api/journeys/:journeyId/members`: `GET` (pessoas com `name`, `image`, `color`, `resourceIds`), `PUT :userId/resources` (`{ resourceIds }` substitui a lista). Leitura: quem vê a journey.
- `PUT`: a própria lista, ou de qualquer um se dono/narrador (senão `403`). Resource fora da journey → `404`. Ficha de outra pessoa → `409`.
- Edição por ficha: dono edita tudo (estrutura e valores). Quem controla a ficha edita só ela: `PATCH` do resource, imagem e links. Estrutura continua só dono.

## Play sessions

- `session_folders` = pasta de sessões. Pertence a uma journey (cascade). 1 nível: pasta não contém pasta.
- `play_sessions` = sessão de jogo (chat). Pertence a uma journey (cascade). `folder_id` nulo = raiz; pasta apagada → `set null`. Nome `play_sessions` porque `sessions` é do Better Auth.
- `position`: pastas e sessões soltas dividem a ordem da raiz; sessões de pasta têm ordem própria dentro dela.
- Rotas em `/api/journeys/:journeyId/`: `GET session-tree` (`{ folders, sessions }` ordenados por `position`), `PUT session-tree` (`{ items }`: layout inteiro), `POST session-folders` (`{ name }`), `PATCH session-folders/:id`, `POST play-sessions` (sem body), `PATCH play-sessions/:id` (`{ title }`). Leitura: quem vê a journey. Escrita: só dono.
- Criação (pasta ou sessão) entra no topo da raiz (`min(position) - 1`). Sessão nasce `Session N` (N = total da journey + 1).
- `PUT session-tree`: `items` lista cada pasta (com `sessionIds`) e cada sessão solta da journey exatamente uma vez, senão `400`. Atualiza só o que mudou, numa transação.
- `session_entries` = itens do chat da sessão, em ordem de `created_at`. `kind` (`narrator` | `player`, a voz), `source` (`user` | `ai`, quem escreveu; padrão `user`), `user_id` (quem escreveu, `set null`; nulo na IA), `resource_id` (ficha que falou, `set null`), `data` (`jsonb`, formato por `kind`; hoje `{ text, name? }`). Texto e nome da ficha gravados como estavam no envio.
- Rotas: `GET`/`POST play-sessions/:sessionId/entries`. Leitura: quem vê a journey. `POST`: `{ kind: 'narrator', text }` só o narrador; `{ kind: 'player', resourceId, text }` só quem controla a ficha, que precisa ser da structure `actor` (senão `403`). Sessão fora da journey → `404`. Sem realtime.

## IA

- `ai_settings` = config de IA por usuário. PK `user_id` (cascade). `model` = id do modelo na OpenRouter. `api_key` = token OpenRouter criptografado (AES-256-GCM, `iv:tag:ciphertext` em base64, segredo `AI_KEY_SECRET`). `api_key_hint` = 4 últimos caracteres.
- Token nunca sai do backend. Resposta expõe só `hasKey` e `keyHint`.
- Rotas em `/api/ai`: `GET models` (OpenRouter `supported_parameters=tools`, cache em memória 1h), `GET settings` (`{ model, hasKey, keyHint }`), `PUT settings` (`{ model?, apiKey? }`, ao menos um), `DELETE settings/key` (`204`).
- `PUT`: modelo fora da lista de `models` → `400`. Token validado na OpenRouter (`GET /key`) antes de salvar; inválido → `400`. OpenRouter fora → `502`.
- Uso interno: `AiService.credentialsOf(userId)` → `{ model, apiKey }` decifrado. Sem modelo ou token → `400`.
- Jogo solo por enquanto: rotas de geração só do dono, com a key dele.
- `OpenRouterClient.chat` = chat completions (formato OpenAI, `tools`, `tool_choice`). `401` → `400` (key recusada), `402` → `400` (sem créditos), `429` → `429`, resto → `502` com a mensagem da OpenRouter.
- `AgentRunner`: `reply` (loop de tools, máx. 6 passos; o último força `tool_choice: 'none'`) e `submit` (saída estruturada: obriga a chamar uma tool cujo input é o resultado, validado por Zod; inválido volta pra IA com o erro, máx. 3 tentativas). Erro de Zod ou `HttpException` numa tool volta pra IA; outro erro sobe.
- Tools (`ai/tools/`, `aiTool` + schema Zod → JSON Schema via `z.toJSONSchema`) chamam os services de domínio com o `userId`: `list_characters` (fichas da structure de actors + quem controla), `read_sheet` (valores como `Label: valor`, só fields simples).
- `journey-context.ts`: journey, structures, campanha e ficha em texto compacto (label, nunca id).
- Flows (`ai/flows/`), rotas em `/api/ai/journeys/:journeyId/`:
  - `POST campaign-options` → 3 campanhas (`submit`, schema de `createCampaignSchema`). Não salva.
  - `POST character-draft` (`{ concept? }`) → `{ name, fields, values }`. Exige campanha e structure de actors (`400`). Structure com fields preenchíveis → IA só preenche (schema montado dos fields: chave = label em slug, choice/boxes viram `enum`). Sem fields → IA cria `number`, `progress`, `short-text`, `long-text`, `choice` com valor; `field-layout.ts` posiciona abaixo dos existentes (12 colunas). Não salva.
  - `POST play-sessions/:sessionId/narration` → IA narra e salva entrada (`kind: 'narrator'`, `source: 'ai'`, `user_id` nulo). Exige `ai_narrator` e campanha (`400`). Contexto: campanha + últimas 30 entradas (IA = assistant, player = `Nome: texto`). Sessão vazia → abertura.

## Campaigns

- `campaigns` = campanha da journey. `journey_id` unique (1 por journey, cascade). `title`, `premise`, `brief` (`jsonb`, `campaignBriefSchema`: `setting`, `tone`, `hook`, `objective`, `npcs[{ name, role }]`).
- Rotas em `/api/journeys/:journeyId/campaign`: `GET` (campanha ou `null`, quem vê a journey), `POST` (só dono; já existe → `409`).

## Characters

- `POST /api/journeys/:journeyId/characters` (`{ name, fields, values }`, só dono): numa transação adiciona `fields` novos à structure de actors (ids novos, senão `400`), cria a ficha com `values` validados e põe o dono no controle (`member_resources`). Sem structure de actors → `400`.

## Contrato

- No backend: auth, avatar, journeys, members, structures, resources, links, play sessions, campaigns, ai.
- Resto: frontend usa `frontend/mock-api/db.json` (json-server).
- Coleções e regras de dados → `frontend/docs/ARCHITECTURE.md`, seção Dados.
