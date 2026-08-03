import type { HistoryPoint, Repo } from "./types.js";

export function compactNumber(n: number): string {
  if (!Number.isFinite(n) || n < 1000) return String(n);
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/**
 * Only http(s) URLs may be used as external link targets. Anything else
 * (javascript:, data:, vbscript:…) falls back to the canonical GitHub URL,
 * which is also what the server derives for favourited repos.
 */
export function safeExternalUrl(
  url: string | null | undefined,
  fullName: string,
): string {
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return url;
      }
    } catch {
      // not a URL — fall through to the canonical fallback
    }
  }
  return `https://github.com/${fullName}`;
}

/** "just now" / "12 min ago" / "3 h ago" / "2 d ago" for an ISO timestamp. */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function buildRepoDecisionSummary(
  repo: Repo,
  points: HistoryPoint[],
  windowDays: number,
): string {
  if (points.length < 2) {
    return `${repo.fullName} has no measured momentum yet. Keep it on the watchlist until a second snapshot gives you a real trend.`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.stars - first.stars;
  const firstTime = Date.parse(first.t);
  const lastTime = Date.parse(last.t);
  const coveredDays = Number.isFinite(firstTime) && Number.isFinite(lastTime)
    ? Math.max(1, Math.round((lastTime - firstTime) / 86_400_000))
    : windowDays;
  const evidence = `${points.length} snapshots across ${coveredDays} day${coveredDays === 1 ? "" : "s"}`;

  if (delta > 0) {
    return `${repo.fullName} gained +${delta.toLocaleString()} stars across ${evidence}. That is the strongest evidence here that attention is building.`;
  }
  if (delta < 0) {
    return `${repo.fullName} fell by ${Math.abs(delta).toLocaleString()} stars across ${evidence}. Treat the current signal cautiously until the next snapshot confirms the direction.`;
  }
  return `${repo.fullName} stayed flat across ${evidence}. Its recent activity may still matter, but there is no measured star momentum yet.`;
}
