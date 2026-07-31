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
