# AGENTS.md — RepoRadar

GitHub discovery dashboard: React 18 + Vite frontend, Express server, node-cron
hourly star tracker, dual storage (Postgres or lite JSON). See `README.md` for
features and ops; this file is the agent contract.

## Commands

```bash
npm run dev              # Vite dev server (frontend only, :5173)
npm run test             # vitest — api/ + server/ (node) and src/ (jsdom)
npm run typecheck        # frontend
npm run typecheck:api    # server + api/_lib
npm run build            # tsc -b && vite build

# Run the server locally:
REPORADAR_MODE=lite npm run server                     # no DB needed
POSTGRES_URL=postgres://... GITHUB_SERVER_TOKEN=... npm run server
```

All of `npm test`, both typechecks, and build must pass before a change is
done. Every behavior change needs a test next to the code it covers
(`*.test.ts(x)` colocated; vitest projects pick up `api/**`, `server/**` in
node env and `src/**` in jsdom).

## Layout

- `src/` — frontend: `pages/`, `components/`, `hooks/`, `lib/`.
- `api/_lib/` — storage + GitHub layer: `storage.ts` defines the
  `RepoStorage` interface; `postgres-store.ts` and `lite-store.ts` are the two
  implementations; `github.ts` normalizes API responses; `sanitize.ts` guards
  README HTML.
- `server/index.ts` — Express app (serves `dist/`, mounts `/api/*`) and the
  node-cron hourly tracker.
- `migrations/` — portable SQL applied automatically on startup
  (`ensureSchema`); `scripts/run-migrations.mjs` for manual bootstrap.

## Hard rules

- **Dual storage is the contract.** Any new data access goes through the
  `RepoStorage` interface and must be implemented in BOTH the Postgres and the
  lite store, with tests for each. Never add a query that only works in one
  mode.
- **Indentation is mixed on purpose:** `src/**` uses 2 spaces;
  `api/_lib/**` and `server/**` use tabs. Before committing after any tool
  batch, run `git diff --stat` — whole-file reformat churn is a bug, not a
  style upgrade (`git diff -w` separates real changes from whitespace).
- Storage is generic Postgres via `POSTGRES_URL` or local JSON — **not
  Supabase**. Don't recommend Supabase-specific steps.
- Never read, write, or commit `.env`. `GITHUB_SERVER_TOKEN` and
  `POSTGRES_URL` are secrets; `.env.example` is the only env file in git.
- GitHub URLs from API data pass through `sanitize.ts` before rendering;
  keep that invariant for any new user- or API-provided HTML/URLs.
- Telegram alerts go through the external bridge CLI (path in
  `REPORADAR_TELEGRAM_BRIDGE_CLI`); dedupe events are only recorded after the
  CLI exits 0. Don't inline Telegram HTTP calls.

## CI (`.github/workflows/docker.yml`)

Verify gate runs `npm test`, both typechecks, and build on every push to
`main`, tags, and PRs; then builds/pushes `ghcr.io/greg-hass/reporadar`.
Action refs are pinned to full commit SHAs on purpose — do not "upgrade" them
to mutable tags.
