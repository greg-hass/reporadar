# RepoRadar

A GitHub discovery dashboard — search repos, browse new repos, and see **fast risers** computed from hourly star snapshots. Self-hosted as a single Docker container + Postgres.

## Quick start (Docker, one command)

```bash
# 1. Create your config
cp .env.example .env
# Edit .env and set GITHUB_SERVER_TOKEN (get one at https://github.com/settings/tokens)

# 2. Build and run
docker compose up -d --build

# 3. Apply the database schema (one time)
docker compose exec app node dist-server/scripts/run-migration.mjs
# (or run the SQL in supabase/migrations/001_init.sql against the db container)

# 4. Open the app
open http://localhost:3000
```

The first star snapshot runs automatically on startup, then hourly. Risers become meaningful after the job has run on at least two different hours.

## Updating (prebuilt image from GHCR)

Every push to `main` builds and publishes `ghcr.io/greg-hass/reporadar:latest` via GitHub Actions (see `.github/workflows/docker.yml`). On the server:

```bash
docker compose pull
docker compose up -d
```

If the GHCR package is private (the default), log in on the server once first:

```bash
# PAT with read:packages scope — https://github.com/settings/tokens
docker login ghcr.io -u greg-hass
```

Or make the package public (GitHub → Packages → reporadar → Package settings → Change visibility) and no login is needed.

## What it does

- **Search** — keyword + filters (language, min stars, created-since), sorted by stars/date/relevance. Live GitHub Search API.
- **New** — repos created in the last 1/7/30 days.
- **Fast Risers** — repos gaining the most stars over 1d/7d/30d, with inline sparklines. Computed from the hourly snapshots.
- **Themes** — Aurora (default) / GitHub Dark / Light, toggleable in the sidebar.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Express server (Node, single container)     │
│  • serves the built React frontend (dist/)   │
│  • /api/search   → live GitHub Search API    │
│  • /api/risers   → computed from Postgres    │
│  • /api/repos/:id/history → star snapshots   │
│  • node-cron: hourly star-tracking job       │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  Postgres 16 (separate container, volume)    │
│  tables: repos, star_snapshots               │
└─────────────────────────────────────────────┘
```

## Configuration (`.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GITHUB_SERVER_TOKEN` | **yes** | — | Server-side GitHub API token (anonymous users share it, 5k req/hr) |
| `POSTGRES_USER` | no | `postgres` | DB user (compose creates it) |
| `POSTGRES_PASSWORD` | no | `postgres` | DB password |
| `POSTGRES_DB` | no | `reporadar` | DB name |
| `CRON_SCHEDULE` | no | `0 * * * *` | 5-field cron; hourly by default |
| `PORT` | no | `3000` | Host port |

## Development (without Docker)

```bash
npm install
cp .env.example .env  # set GITHUB_SERVER_TOKEN + POSTGRES_URL
npm run dev           # Vite dev server (frontend only, on :5173)
npm run build         # build frontend
npm run typecheck     # typecheck frontend
npm run typecheck:api # typecheck API + server
```

To run the server locally against a local/distant Postgres: `npx tsx server/index.ts`

## Tech stack

React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · React Router · Express · node-cron · pg · Postgres 16.
