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
- Dockerfile: stage `dev` (compose: `db:migrate` + `db:seed` + hot reload) e `production` (final: `dist/database/migrate.js` + `dist/database/seed.js` + API, a cada boot; leva `dist` e `drizzle/`; exige `SYSTEM_USER_*`).
- Auth: Better Auth + `@thallesp/nestjs-better-auth`. Sessão em banco + cookie.
- Arquivos: Supabase Storage (só storage) via `@supabase/supabase-js`, secret key no backend.
- Sem realtime até precisar. Realtime → gateway WebSocket do Nest.
- IA: OpenRouter via `fetch` (`ai/runtime/openrouter.client.ts`). Token do próprio usuário.

## Repo

```text
src/
  main.ts                 bootstrap
  app.module.ts           módulo raiz
  env.ts                  schema Zod do env
  core/                   infra transversal
    database/             DatabaseModule global, token DATABASE, migrate, seed
    auth/                 instância Better Auth + tabelas de auth
    storage/              StorageModule global: ImageStorageService, ImageUpload (Supabase Storage)
    common/               código compartilhado entre domínios (ZodValidationPipe, ndjson)
    health/
  system/                 systems, members, invites, avatar
  model/                  structures, fields, tags, templates, resources, links
  story/                  campaigns, play-sessions, session-zero
  onboarding/             system-drafts, catalog
  <grupo>/<domínio>/
    <domínio>.module.ts
    <domínio>.controller.ts
    <domínio>.service.ts
    <domínio>.schema.ts   tabelas Drizzle
    dto/
  ai/
    ai.module.ts
    settings/             AiSettingsController, AiService, chave cifrada
    runtime/              OpenRouterClient, AgentRunner, aiTool, KeyedLimiter, tolerantParse, closedItemsOf
    context/              WorldSource, describe*, layout e valores de field, STRUCTURE_ICONS
    building/             BuildingController; flows de criação do mundo (system e rascunho)
      <flow>/             <flow>.flow.ts, <flow>.prompt.ts, dto, spec
    play/                 PlayController; arc-start, narration, tools/
drizzle/                  migrations geradas
drizzle.config.ts
Dockerfile
docker-compose.yml
docs                      PRODUCT.md, ARCHITECTURE.md
```

- Padrão Nest CLI: um módulo por domínio (`nest g resource`), domínio dentro do grupo.
- Prompt de IA em `<flow>.prompt.ts`, separado do código do flow.
- ESM: import relativo com `.js`.
- Body validado com `ZodValidationPipe` + schema `drizzle-zod` em `dto/`. Param uuid → `ParseUUIDPipe`. Falha → `400 { code: 'INVALID_INPUT', message, issues }`.
- Erro pro usuário: exception do Nest com `{ code, message }` (`code` em `SCREAMING_SNAKE`, `message` em inglês pra log). Front traduz pelo `code`.
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
- Migrations: `drizzle-kit generate` + `migrate`, versionadas. `push` só local. Produção aplica com o migrator do `drizzle-orm` (`src/core/database/migrate.ts`, sem `drizzle-kit`).

## Auth

- Better Auth em `/api/auth/*`, fora dos controllers. Plugin `openAPI` gera doc das rotas; `main.ts` mescla no Swagger.
- `TRUSTED_ORIGINS`: origens extras aceitas pelo Better Auth (dev: Swagger em `localhost:3000`).
- Login: Google, Discord, email/senha.
- Email/senha exige email verificado. Envio via Resend.
- Cadastro com email existente → `422 USER_ALREADY_EXISTS` (hook `before` em `auth.ts`). Sem ele, Better Auth responde sucesso genérico e não envia email.
- `users` = pessoa. `accounts` = forma de login (1 por provedor). `sessions`, `verifications`.
- Mesmo email verificado em outro provedor → mesma `users`.
- `users.role`: `COMMON` (padrão) | `SYSTEM`. `SYSTEM` só via seed (`src/core/database/seed.ts`). Nenhuma rota altera `role` (`input: false`).
- `users.locale`: idioma da interface (`en` padrão | `pt-BR` | `zh-CN` | `es`, `core/auth/locales.ts`). Additional field `input: true`: vai no sign-up e em `/api/auth/update-user`; sem valor na criação (ex.: login social) → `Accept-Language` (`databaseHooks.user.create.before`). Não afeta conteúdo do jogo.
- Emails de auth (verificação, reset) no idioma do usuário (`core/auth/auth-emails.ts`).

## Imagens

- `ImageStorageService.replace(bucket, pasta, arquivo, persist?)`: sobe, persiste URL, apaga anteriores da pasta. PNG, JPEG ou WebP, até 2 MB.
- Bucket `avatars`: usuário em `<userId>/` (`POST /api/avatar`), system em `systems/<systemId>/` (`POST /api/systems/:id/avatar`).
- Bucket `images`: field image em `<systemId>/<resourceId>/<fieldId>/`. Upload só devolve URL; valor salvo pelo autosave do resource.

## Systems

- `systems` = System (conceito do produto). Dono em `owner_id`.
- `system_members` = pessoas da system, dono incluso (entra na criação). PK `(system_id, user_id)`. `color` = hue sorteada ao entrar (`pickMemberColor`, prioriza livres entre as 8 de `member-colors.ts`).
- Usuário vê system se é dono ou participante. Fora disso → `404`.
- `PATCH`/`DELETE`/`POST :id/avatar` só dono. Participante → `403`.
- `systems.icon` = id do ícone (catálogo do front), opcional. `initials` continua obrigatória.
- `systems.narrator_id` = único narrador (coluna única garante 1). Nasce = dono (ou `null` se criada com `aiNarrator: true`). `PATCH` com `narratorId` (só dono): precisa estar em `system_members`, senão `400`; `null` = sem narrador.
- `systems.ai_narrator` = a IA narra (paga com a key do dono). `PATCH` com `aiNarrator: true` zera `narrator_id`; `aiNarrator: false` sem `narratorId` põe o dono como narrador; `narratorId` preenchido desliga `ai_narrator`; os dois juntos → `400`.
- Entrada de participante: por convite (`invites/`). `systems.invite_code` (unique, nulo até o dono pedir) = código do link.
  - `POST /api/systems/:systemId/invite` (só dono) → `{ code }`; cria na primeira chamada, depois devolve o mesmo.
  - `GET /api/invites/:code` → prévia (`systemId`, `name`, `initials`, `icon`, `color`, `avatarUrl`, `ownerName`, `member`). Código inexistente → `404`.
  - `POST /api/invites/:code/accept` → entra em `system_members` com cor de `pickMemberColor` (idempotente) e devolve a system.

## System drafts

- `system_drafts` = sistema em montagem no onboarding. Nada vai para as tabelas reais até o commit. Dono em `owner_id`; vários incompletos por usuário.
- `status`: `incomplete` | `complete`. `system_id` preenchido no commit.
- Seções em `jsonb`: `progress` (estado do front para retomar), `system`, `options` (3 campanhas `{ option, world }`), `structure_tags`, `field_tags`, `structures`, `resources`, `questions`. Ids de estruturas, registros e tags já são uuid e entram iguais no commit.
- Rotas em `/api/system-drafts`: `GET` (incompletos), `GET tags` (tags globais), `GET/PATCH/DELETE :id`, `POST` (cria), `POST :id/commit` (transação: system + membro dono, tags, estruturas + links, registros, sessão zero; marca `complete`).
- IA no rascunho em `/api/ai/system-drafts/:draftId/`: `worlds` (NDJSON: 3 campanhas em paralelo, só sinopse, uma `CampaignOption` por linha na ordem em que ficam prontas; no fim grava `options` nessa ordem com `world: null`; todas falham → erro normal), `structures` (NDJSON), `population` (NDJSON), `session-zero/questions` (NDJSON). Flows leem por `WorldSource` (`ofSystem` banco, `ofDraft` rascunho), mesmos dados nos dois.
- Sessão Zero (`session_zero_questions`; `/api/systems/:systemId/session-zero/questions`: `GET`, `PUT` substitui tudo): perguntas fixadas pelo dono, sem limite, em ordem (`position`), feitas a todo convidado novo. Pergunta: `prompt` (≤90, `SESSION_ZERO_PROMPT`; IA instruída: título = 1 frase curta, ≤90, corta situação e mantém pergunta; schema valida; título longo cortado por `tolerantParse`), `format` (`single` | `multiple` | `text` | `number`), `options` (só choices, 2–6, cada ≤120; `details` = significado por opção), `min`/`max` (só `number`, min < max), `reword` (Oráculo reconta na história de cada convidado; padrão `true`). Sem vínculo com campo da ficha: a ficha nasce depois, das respostas. `questionRows` normaliza (tira opções e limites que não cabem no formato) no `PUT` e no commit do rascunho. Migration 0027 converteu as antigas: com ≥2 significados em `details` → `single` com essas opções; resto → `text`. IA (`session-zero/questions`, system e rascunho; NDJSON via `submitEach`, uma pergunta por linha, corta depois de 6): 3–6 perguntas indiretas e situacionais; sempre cobrem os obrigatórios (`REQUIRED`: nome, background, personalidade, aparência, com descrição); `POSSIBILITIES` = 7 grupos opcionais (identidade e origem, psicologia, capacidades, papel e sociedade, relações, recursos, desenvolvimento narrativo) como ideias, não checklist: IA usa quantos fizerem sentido e pode ir além; respostas alimentam a ficha criada depois; formato novo (`questionOf`).
- Chamadas ao OpenRouter: no máximo 8 simultâneas por key (`KeyedLimiter`), resto em fila.

## Structures

- `structures` = modelo. Pertence a uma system (`system_id`, cascade). Fields em `fields` (`jsonb`): tipo, label, posição no grid, options, config e `tagIds` (papel do campo, que orienta o Oráculo). Compartilhado por todos os resources dela.
- Rotas em `/api/systems/:systemId/structures`. Leitura: quem vê a system. Escrita: só dono.
- `capability` (`text`, `STRUCTURE_CAPABILITIES`: `actor`; `null` = nenhuma). Structure `actor` = fichas jogáveis da system; todas as fichas dela são actors. Máximo 1 por system (`structures_actor_unique`, índice único parcial). `POST`/`PATCH` com `actor` tira a marca da anterior na mesma transação; sair de `actor` remove o controle (`member_resources`) das fichas dela.
- `fields`: Zod valida só campos base (`id`, `type`, `label`, `column`, `row`, `span`, `rows`, `options`). Config de cada tipo passa sem checagem.
- `PATCH` de `fields` não apaga nada: permite undo/redo no edit do front.
- `POST /api/systems/:systemId/structures/:id/prune` (só dono, `204`): apaga dos resources da structure valores de field inexistente e links de field/coluna removida ou com target trocado. Front chama ao sair do edit.

## Resources

- `resources` = objeto real. Pertence a uma structure (`structure_id`, cascade). Valores em `values` (`jsonb`), chave = id do field.
- Rotas: `GET /api/systems/:systemId/resources`, `POST /api/systems/:systemId/structures/:structureId/resources`, `PATCH /api/systems/:systemId/resources/:id`, `POST /api/systems/:systemId/resources/:id/fields/:fieldId/image`.
- Leitura: quem vê a system. Criar: só dono. `PATCH` e imagem: dono ou quem controla a ficha (`MembersService.ensureEditor`).
- `values` validado por Zod montado dos fields da structure (`resource-values.ts`, tipo por `type`). Chave de field inexistente ou sem valor (section, separator) é descartada. `PATCH` substitui `values` inteiro.

## Links

- `links` = seleção de Relation. Uma linha por target: `source_id` (resource dono), `field_id`, `row_id`, `column_id`, `target_id`. FKs em `resources`, cascade. Unique com `NULLS NOT DISTINCT`.
- Célula Relation de table: `row_id` + `column_id` preenchidos. Linhas e células próprias da table seguem em `values`; célula Relation vive só em `links`.
- Coluna Relation (config em `fields`): `relation.structureId`, `targets` (`one` = 1 por célula) e `sources` (`one` = target em 1 célula só, entre todos os resources).
- Choice/boxes em modo relation (config `chips.relation.structureId`): `row_id` e `column_id` nulos. Seleção vive só em `links`. Choice = 1 target, boxes = vários. Sem restrição de `sources`.
- Rotas: `GET /api/systems/:systemId/links` (todos da system), `PUT /api/systems/:systemId/resources/:id/links` (`{ fieldId, rowId, columnId, targetIds }` substitui a seleção; `rowId`/`columnId` juntos, ambos `null` para choice/boxes). Leitura: quem vê a system. Escrita: dono ou quem controla o resource de origem.
- `PUT` valida relation existente, linha existente em `values` (table), target na structure da relation e na system, cardinalidade (`400`/`409`).
- Limpeza: `PATCH` de `values` apaga, na mesma transação, links de linha removida (só tables existentes na structure). Links de field/coluna removida ou com target trocado saem no `prune` da structure.

## Members

- `member_resources` = fichas que cada pessoa controla. PK `resource_id` (1 ficha = 1 pessoa). FK `(system_id, user_id)` → `system_members` (`member_resources_member_fk`, cascade); `resource_id` → `resources` (cascade). Só fichas da structure `actor` (`PUT` com outra → `400`).
- Rotas em `/api/systems/:systemId/members`: `GET` (pessoas com `name`, `image`, `color`, `resourceIds`), `PUT :userId/resources` (`{ resourceIds }` substitui a lista). Leitura: quem vê a system.
- `PUT`: a própria lista, ou de qualquer um se dono/narrador (senão `403`). Resource fora da system → `404`. Ficha de outra pessoa → `409`.
- Edição por ficha: dono edita tudo (estrutura e valores). Quem controla a ficha edita só ela: `PATCH` do resource, imagem e links. Estrutura continua só dono.

## Play sessions

- `session_folders` = pasta de sessões. Pertence a uma system (cascade). 1 nível: pasta não contém pasta.
- `play_sessions` = sessão de jogo (chat). Pertence a uma system (cascade). `folder_id` nulo = raiz; pasta apagada → `set null`. Nome `play_sessions` porque `sessions` é do Better Auth.
- `position`: pastas e sessões soltas dividem a ordem da raiz; sessões de pasta têm ordem própria dentro dela.
- Rotas em `/api/systems/:systemId/`: `GET session-tree` (`{ folders, sessions }` ordenados por `position`), `PUT session-tree` (`{ items }`: layout inteiro), `POST session-folders` (`{ name }`), `PATCH session-folders/:id`, `DELETE session-folders/:id`, `POST play-sessions` (`{ folderId? }`: pasta da system, senão `404`; entra no topo da pasta ou da raiz), `PATCH play-sessions/:id` (`{ title }`), `DELETE play-sessions/:id`. Leitura: quem vê a system. Escrita: só dono.
- `DELETE session-folders/:id` apaga a pasta e as sessões dentro dela, numa transação. `DELETE play-sessions/:id` apaga a sessão. Entradas das sessões apagadas vão junto (cascade). Fora da system → `404`.
- Criação (pasta ou sessão) entra no topo da raiz (`min(position) - 1`). Sessão nasce `Session N` (N = total da system + 1).
- `PUT session-tree`: `items` lista cada pasta (com `sessionIds`) e cada sessão solta da system exatamente uma vez, senão `400`. Atualiza só o que mudou, numa transação.
- `session_entries` = itens do chat da sessão, em ordem de `created_at`. `kind` (`narrator` | `player`, a voz), `source` (`user` | `ai`, quem escreveu; padrão `user`), `user_id` (quem escreveu, `set null`; nulo na IA), `resource_id` (ficha que falou, `set null`), `data` (`jsonb`, formato por `kind`; hoje `{ text, name? }`). Texto e nome da ficha gravados como estavam no envio.
- Rotas: `GET`/`POST play-sessions/:sessionId/entries`. Leitura: quem vê a system. `POST`: `{ kind: 'narrator', text }` só o narrador; `{ kind: 'player', resourceId, text }` só quem controla a ficha, que precisa ser da structure `actor` (senão `403`). Sessão fora da system → `404`. Sem realtime.

## IA

- `ai_settings` = config de IA por usuário. PK `user_id` (cascade). `model` = id do modelo na OpenRouter. `api_key` = token OpenRouter criptografado (AES-256-GCM, `iv:tag:ciphertext` em base64, segredo `AI_KEY_SECRET`). `api_key_hint` = 4 últimos caracteres.
- Token nunca sai do backend. Resposta expõe só `hasKey` e `keyHint`.
- Rotas em `/api/ai`: `GET models` (OpenRouter `supported_parameters=tools`, cache em memória 1h), `GET settings` (`{ model, hasKey, keyHint }`), `PUT settings` (`{ model?, apiKey? }`, ao menos um), `DELETE settings/key` (`204`).
- `PUT`: modelo fora da lista de `models` → `400`. Token validado na OpenRouter (`GET /key`) antes de salvar; inválido → `400`. OpenRouter fora → `502`.
- Uso interno: `AiService.credentialsOf(userId)` → `{ model, apiKey }` decifrado. Sem modelo ou token → `400`.
- Jogo solo por enquanto: rotas de geração só do dono, com a key dele.
- `OpenRouterClient.chat` = chat completions (formato OpenAI, `tools`, `tool_choice`). `401` → `400` (key recusada), `402` → `400` (sem créditos), `429` → `429`, resto → `502` com a mensagem da OpenRouter. `chatStream` = mesmo request com `stream: true` (SSE); repassa os argumentos do tool call conforme chegam.
- `AgentRunner`: `reply` (loop de tools, máx. 6 passos; o último força `tool_choice: 'none'`) e `submit` (saída estruturada: obriga a chamar uma tool cujo input é o resultado, validado por Zod; inválido volta pra IA com o erro, máx. 3 tentativas). `submitEach` = `submit` em stream para resultado `{ lista: [...] }`: cada item fechado (`closedItemsOf`) é validado sozinho e entregue na hora; item inválido é pulado; nenhum válido → volta pra IA com o erro (máx. 3). Erro de Zod ou `HttpException` numa tool volta pra IA; outro erro sobe. `submit` e `submitEach` (tarefas do onboarding) pedem `reasoning: { effort: 'low' }`; `reply` (narração) usa o padrão do modelo. Validação tolerante (`tolerantParse`): falhou o Zod → ajusta o que dá (texto longo cortado na última palavra inteira por `shortened`, lista com itens a mais cortada, número fora do intervalo vira o limite) e valida de novo; só volta pra IA se ainda falhar. Log por chamada: `nome levou Xms em N tentativa(s)`; falha final → `warn`.
- Tools (`ai/play/tools/`, `aiTool` + schema Zod → JSON Schema via `z.toJSONSchema`) chamam os services de domínio com o `userId`: `list_characters` (fichas da structure de actors + quem controla), `read_sheet` (valores como `Label: valor`, só fields simples).
- `ai/context/describe.ts`: system, structures, campanha e ficha em texto compacto (label, nunca id). Campo descrito com tipo e tags (`@slug: descrição`); estrutura com suas tags.
- Stream (`core/common/ndjson.ts`, `streamLines`): `application/x-ndjson`, um JSON por linha. Erro antes da 1ª linha → resposta de erro normal; depois → linha `{ error: { code, message } }` e fecha.
- Interrupção: `worlds`, `structures`, `population` e `session-zero/questions` (system e rascunho) usam `closedSignal(response)` (`core/common/closed-signal.ts`): cliente fecha a conexão antes da resposta → aborta com `HttpException` 499. Sinal vai em `AiCredentials.signal` (`credentialsOf(userId, signal)`) até o `fetch` do OpenRouter (`chat`/`chatStream`); flow checa antes de gravar (`worlds` não salva `options`; `population` manda as fichas em stream mas só grava no fim, com ganchos, então interrompida não grava nada). Stream com conexão fechada não escreve linha de erro.
- Flows (`ai/building/`, `ai/play/`):
  - `POST /api/ai/campaign-options` (`{ direction?, moods? }`) → 3 sistemas `{ name, theme }`. Flow sorteia 3 sets disjuntos de 3–5 temas de `catalog_themes` (`CatalogService.randomThemes`, `order by random()`); pra cada set a IA cria 5 nomes (uma palavra ou duas com "&") misturando os temas do set e escolhe o melhor. `direction` tem prioridade sobre os sets. Sem system. Não salva.
- Flows em `/api/ai/systems/:systemId/`:
  - `POST campaign-start` → IA cria campanha local no mundo da system (contexto: system + structures), `replace` da campanha, folder com o título, sessão dentro e abertura (`brief.opening`) como primeira narração IA. Devolve `{ campaign, session, opening }`.
  - `POST structures` (`{ themes, structures, kept?, replaced? }`) → NDJSON, uma proposta `{ name, icon, tagIds, fields }` por linha conforme a IA gera (3–4 estruturas, 2–4 campos cada, até 8 na de `atores`; campos além do teto cortados). `kept` (`{ name, tags }`, travadas no front) nunca voltam; com `replaced` (`{ name, fields }`, na ordem) a IA gera exatamente essa quantidade de novas, uma por substituída, diferentes das travadas e das substituídas; `fields` = campos travados da substituída, que entram primeiro na nova (mesmo id, sem repetir label) e o resto é gerado abaixo. Não salva.
  - `POST population` (`{ replace?, request? }`) → NDJSON: uma linha `{ records }` por structure assim que a IA termina (fichas com `id` já definido, valores ainda sem `parseResourceValues`), última linha `{ resources }` (gravado; mesmos `id`s, `NewResource.id` → `ResourcesService.create(..., id)` / `replacedResources`). Gera 2–3 fichas por structure, inclusive a de `atores` (personagens prontos pra jogar); `request` gera no máx. 4. Contexto lista fichas existentes com os valores (`- Nome (Estrutura)` + `  Campo: valor` por linha). Relações entre fichas (amizade, aliança, neutro, rivalidade, ódio) só em texto, nos campos de texto (principalmente `descricao`). `replace` refaz essas fichas por structure. Salva via `WorldSource.replaceResources`.
  - `POST play-sessions/:sessionId/narration` → IA narra e salva entrada (`kind: 'narrator'`, `source: 'ai'`, `user_id` nulo). Exige `ai_narrator` e campanha (`400`). Contexto: campanha + últimas 30 entradas (IA = assistant, player = `Nome: texto`). Sessão vazia → abertura.

## Campaigns

- `campaigns` = campanha da system. `system_id` unique (1 por system, cascade). `title`, `premise`, `brief` (`jsonb`, `campaignBriefSchema`: `opening`, `setting`, `culture`, `politics`, `tone`, `localTheme`, `hook`, `problem`, `escalation`, `complications[]`, `npcs[{ name, role, description }]`).
- Rotas em `/api/systems/:systemId/campaign`: `GET` (campanha ou `null`, quem vê a system), `POST` (só dono; já existe → `409`), `PUT` (só dono; cria ou substitui).

## Catálogos

- `field_types` = tipos de field (`id` = slug do tipo, `name`, `icon`, `description`, `position`). `GET /api/fields` ordenado por `position`.
- `templates` = templates de system (`id` slug, `name`, `summary`, `icon`, `color`, `position`). `template_categories` = categorias do template (PK `(template_id, position)`, `name`, `icon`, cascade).
- `GET /api/templates` → templates ordenados por `position`, cada um com `categories: [{ name, icon }]`.
- Só leitura. Dados vêm de `src/core/database/seed.ts`: upsert por `id`, categorias recriadas.
- Catálogo estático (prefixo `catalog_`, só seed escreve, sem rota; leitura via `CatalogService`): `catalog_themes` (`id` identity, `name` unique), `catalog_species` (`id` do arquivo, `name`, `category`), `catalog_species_themes` (PK `(species_id, theme_id)`, cascade nos dois, índice em `theme_id`).
- Seeds em `src/onboarding/catalog/` (`themes.seed.ts`, `species.seed.ts`). Fontes em `src/core/database/seeds/` (copiadas pro `dist` via assets do `nest-cli.json`): `themes.txt` (nomes separados por vírgula) e `species.json` (`{ species: [{ id, name, category, themes[] }] }`). `seed.ts` chama `seedThemes` e depois `seedSpecies`: só adiciona (tema, espécie por `id` e vínculo novos); nunca atualiza nem apaga. Diff em memória, só grava o que é novo, lotes de 5000. Tema citado na espécie e ausente em `themes.txt` → sem vínculo.

## Contrato

- No backend: auth, avatar, systems, invites, members, structures, resources, links, play sessions, campaigns, ai, fields, templates. Frontend não usa mock.
