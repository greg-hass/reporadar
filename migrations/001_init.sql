-- RepoRadar initial schema
-- Tables: repos, star_snapshots, and persisted watchlist metadata.

CREATE TABLE IF NOT EXISTS repos (
  id              bigint PRIMARY KEY,
  full_name       text NOT NULL,
  description     text,
  language        text,
  topics          text[] NOT NULL DEFAULT '{}',
  stars_total     integer NOT NULL DEFAULT 0,
  forks           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL,
  pushed_at       timestamptz NOT NULL,
  license         text,
  owner_avatar    text NOT NULL,
  html_url        text NOT NULL,
  updated_from_gh timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS star_snapshots (
  repo_id     bigint NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL,
  stars       integer NOT NULL,
  PRIMARY KEY (repo_id, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_star_snap_repo_time ON star_snapshots (repo_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_star_snap_captured ON star_snapshots (captured_at);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repos (language);

CREATE TABLE IF NOT EXISTS favourites (
  repo_id    bigint PRIMARY KEY,
  payload    jsonb NOT NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  tags       text[] NOT NULL DEFAULT '{}',
  note       text NOT NULL DEFAULT '',
  status           text NOT NULL DEFAULT 'watching',
  updated_at       timestamptz NOT NULL DEFAULT now(),
  telegram_enabled boolean NOT NULL DEFAULT false,
  alert_threshold  integer NOT NULL DEFAULT 50
);

ALTER TABLE favourites ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'watching';
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS telegram_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS alert_threshold integer NOT NULL DEFAULT 50;

CREATE TABLE IF NOT EXISTS watchlist_alert_events (
  signature   text PRIMARY KEY,
  repo_id     bigint NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_alert_repo ON watchlist_alert_events (repo_id, snapshot_at DESC);
