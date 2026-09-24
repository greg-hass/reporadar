-- Retry GitHub-missing favourites only once every 30 days; keep watchlist metadata intact.
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS github_unavailable_at timestamptz;
