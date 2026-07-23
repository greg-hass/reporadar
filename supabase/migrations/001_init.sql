-- RepoRadar Phase 1 schema
-- Tables: repos (cached metadata), star_snapshots (time-series driving risers/trending)

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
