export function compactNumber(n: number): string {
  if (!Number.isFinite(n) || n < 1000) return String(n);
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
