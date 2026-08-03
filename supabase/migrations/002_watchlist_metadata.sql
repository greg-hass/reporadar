-- RepoRadar Phase 2 schema: persisted watchlist context.
-- Idempotent so it is safe for databases created before Phase 2.
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'watching';
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
