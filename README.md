# RepoRadar

A GitHub discovery dashboard — search repos, browse new repos, and see **fast risers** computed from hourly star snapshots.

## Quick start (lite mode, no Postgres)

```bash
docker compose -f docker-compose.lite.yml up -d --build
open http://localhost:3000
```

Lite mode needs no `.env`, GitHub token, or database. It stores favourites and snapshots in a local JSON volume. Anonymous GitHub API limits apply, and the local history disappears if that volume is deleted.

## Quick start (durable mode)

```bash
cp .env.example .env
# Set GITHUB_SERVER_TOKEN in .env

docker compose up -d --build
open http://localhost:3000
```

Durable mode uses Postgres and a server-side token for hourly tracking. The database schema is applied automatically on startup. Risers become meaningful after the tracker has run on at least two different hours.

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

- **Pulse** — the home dashboard: stats band (repos tracked, snapshots, stars gained), the #1 riser of the week, top risers, and freshly created repos at a glance.
- **Search** (`/search`) — keyword + filters (language, topics, min stars, created-since, and recently pushed), sorted by stars/date/relevance. Live GitHub Search API with saved research presets.
- **New** — repos created in the last 1/7/30 days.
- **Fast Risers** — repos gaining the most stars over 1d/7d/30d, with velocity-per-day figures and inline sparklines. Computed from the hourly snapshots.
- **Repo detail** (`/repo/:owner/:name`) — metadata, README, related repos, an interactive star-history chart (7/30/90 days), and a deterministic evidence brief; tracked repos come from the DB, anything else is live from GitHub.
- **Compare** — select up to three repos from any list and get side-by-side momentum, evidence, size, activity, license, and topic signals plus a plain-English decision brief.
- **Watchlist metadata** — tag, annotate, pause, archive, and bulk-edit watched repos.
- **Telegram alerts** — opt in per repo with a star threshold; the hourly tracker deduplicates alerts, skips paused/archived repos, and honours optional quiet hours. This uses the external Telegram bridge, not browser notifications.
- **Themes** — Aurora (default) / GitHub Dark / Tokyo Night / Light, toggleable in the sidebar.
- **PWA** — installable on iPhone/iPad/Android home screens (standalone, full-screen, themed icon).

Every list supports keyboard navigation: `j` / `k` to move, `↵` to open, `/` to jump to search.

## Architecture

```text
┌─────────────────────────────────────────────┐
│  Express server (Node, single container)     │
│  • serves the built React frontend (dist/)   │
│  • /api/search   → live GitHub Search API    │
│  • /api/risers   → computed from storage     │
│  • /api/stats    → dashboard counters        │
│  • /api/alerts/status → Telegram bridge      │
│  • /api/repos/:id/history → star snapshots   │
│  • node-cron: hourly star-tracking job       │
└───────────────────┬─────────────────────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
┌──────▼───────┐       ┌─────────▼──────────┐
│ Postgres     │       │ Lite JSON storage  │
│ durable mode │       │ zero-config mode   │
└──────────────┘       └────────────────────┘
```

## Configuration (`.env`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `REPORADAR_MODE` | no | auto | `postgres` for durable history or `lite` for JSON storage |
| `GITHUB_SERVER_TOKEN` | no in lite mode | — | Server-side GitHub token; anonymous API access works in lite mode |
| `REPORADAR_DATA_DIR` | no | `./data` | JSON storage directory used by lite mode |
| `POSTGRES_USER` | no | `postgres` | DB user (compose creates it) |
| `POSTGRES_PASSWORD` | no | `postgres` | DB password |
| `POSTGRES_DB` | no | `reporadar` | DB name |
| `CRON_SCHEDULE` | no | `0 * * * *` | 5-field cron; hourly by default |
| `REPORADAR_TELEGRAM_BRIDGE_CLI` | no | `~/.pi/agent/telegram-bridge/dist/outbound/cli.js` | Path to the external Telegram bridge CLI |
| `REPORADAR_TELEGRAM_QUIET_START` | no | — | Local server hour (0–23) at which Telegram delivery starts being suppressed |
| `REPORADAR_TELEGRAM_QUIET_END` | no | — | Local server hour (0–23) at which Telegram delivery resumes |
| `REPORADAR_TELEGRAM_TIMEOUT_MS` | no | `30000` | Maximum time to wait for one bridge delivery |
| `PORT` | no | `3000` | Host port |

## Development (without Docker)

```bash
npm install
cp .env.example .env  # set GITHUB_SERVER_TOKEN + POSTGRES_URL
npm run dev           # Vite dev server (frontend only, on :5173)
npm run build         # build frontend
npm run test          # run API, storage, and database unit tests
npm run typecheck     # typecheck frontend
npm run typecheck:api # typecheck API + server
```

To run the server locally in lite mode: `REPORADAR_MODE=lite npm run server`.

To run it against a local/distant Postgres: `POSTGRES_URL=postgres://... GITHUB_SERVER_TOKEN=... npm run server`.

Telegram delivery is intentionally delegated to the bridge process. The server pipes one Markdown message to the CLI and records a dedupe event only after the CLI exits successfully. If the bridge is unavailable, the UI reports that state and the cron job logs the failure without marking the alert as sent.

## GitGlance migration

GitGlance has graduated into RepoRadar. RepoRadar is now the maintained product; GitGlance remains as a historical lightweight client-only version. New features and fixes belong here.

## Tech stack

React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · React Router · Express · node-cron · pg · Postgres 16.
