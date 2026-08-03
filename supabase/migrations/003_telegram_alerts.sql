-- RepoRadar Phase 3 schema: opt-in Telegram alert rules and dedupe state.
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS telegram_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS alert_threshold integer NOT NULL DEFAULT 50;

CREATE TABLE IF NOT EXISTS watchlist_alert_events (
  signature   text PRIMARY KEY,
  repo_id     bigint NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_alert_repo ON watchlist_alert_events (repo_id, snapshot_at DESC);
