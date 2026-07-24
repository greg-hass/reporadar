import type { Repo, SearchParams, Stats } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

function toQuery<T extends object>(params: T): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) sp.set(k, v.join(","));
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchSearch(params: SearchParams): Promise<{ items: Repo[]; total: number }> {
  return getJson(`/search${toQuery(params)}`);
}

export async function fetchRisers(window: "1d" | "7d" | "30d", page = 1): Promise<{ items: Repo[]; total: number }> {
  return getJson(`/risers${toQuery({ window, page })}`);
}

export async function fetchHistory(id: number, days = 30): Promise<{ points: number[] }> {
  return getJson(`/repos/${id}/history${toQuery({ days })}`);
}

export async function fetchStats(): Promise<Stats> {
  return getJson("/stats");
}
