# Vantage — Backend

API do Vantage: NestJS + PostgreSQL + Drizzle.

## Requisitos

- Docker

## Rodar

```sh
cp .env.example .env         # preencher, ver Env
docker compose up            # Postgres + API com hot reload → http://localhost:3000
```

- `api` sobe com `npm ci` → `db:migrate` → `db:seed` → `start:dev`.
- Pasta `backend/` montada no container: mudança no código recarrega a API; arquivo gerado no container aparece aqui.
- `node_modules` fica em volume do container.
- Postgres exposto em `localhost:5432` (vantage/vantage).

Comando no container:

```sh
docker compose exec api npm run <script>
docker compose exec api npm install <pacote>
```

- Swagger → http://localhost:3000/api/docs
- Health → `GET /api/health` (checa Postgres)
- Login passa pelo front (`localhost:4200/api/auth/*`, proxy).

### Testar pelo Swagger

1. `POST /api/auth/sign-up/email` ou `POST /api/auth/sign-in/email`. Cookie de sessão fica no navegador.
2. Rotas protegidas usam o cookie automaticamente.
3. Cadastro exige email verificado. Link do email abre `localhost:4200` (front rodando) ou chamar `GET /api/auth/verify-email?token=…` no Swagger.
4. Usuário SYSTEM (seed) já nasce verificado.

## Env

- `BETTER_AUTH_SECRET` → `openssl rand -base64 32`
- Google → Google Cloud Console, OAuth client. Redirect URI: `http://localhost:4200/api/auth/callback/google`
- Discord → Discord Developer Portal, OAuth2. Redirect URI: `http://localhost:4200/api/auth/callback/discord`
- `RESEND_API_KEY` → resend.com. `onboarding@resend.dev` só envia pro email da conta Resend.
- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` → Supabase, Project Settings → API Keys (secret key, só no backend). Buckets públicos `avatars` e `images` criados no painel (Storage).

## Banco

```sh
docker compose exec api npm run db:generate   # gera migration a partir dos schemas
docker compose exec api npm run db:migrate    # aplica migrations
docker compose exec api npm run db:seed       # cria usuário SYSTEM (SYSTEM_USER_*)
```

- Drizzle Studio: `npm run db:studio` no host (não no container) → https://local.drizzle.studio

## Checar

```sh
docker compose exec api npm test
docker compose exec api npm run lint
docker compose exec api npm run build
```

## Docs

- [Produto](docs/PRODUCT.md) — conceitos e princípios
- [Arquitetura](docs/ARCHITECTURE.md) — stack, repo, convenções, dados
- [CLAUDE.md](CLAUDE.md) — regras para agentes de código
