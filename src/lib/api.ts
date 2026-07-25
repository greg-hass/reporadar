import type { HistoryPoint, Repo, SearchParams, Stats } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
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

export async function fetchHistory(id: number, days = 30): Promise<{ points: HistoryPoint[] }> {
  return getJson(`/repos/${id}/history${toQuery({ days })}`);
}

export async function fetchStats(): Promise<Stats> {
  return getJson("/stats");
}

export async function fetchRepo(owner: string, name: string): Promise<Repo> {
  return getJson(`/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
}

export async function fetchReadme(owner: string, name: string): Promise<{ html: string | null }> {
  return getJson(`/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`);
}

export async function fetchFavourites(window: "1d" | "7d" | "30d"): Promise<{ items: Repo[]; total: number }> {
  return getJson(`/favourites${toQuery({ window })}`);
}

export async function fetchFavouriteIds(): Promise<{ ids: number[] }> {
  return getJson("/favourites/ids");
}

export async function putFavourite(repo: Repo): Promise<{ ok: boolean }> {
  return sendJson("PUT", `/favourites/${repo.id}`, repo);
}

export async function deleteFavourite(id: number): Promise<{ ok: boolean }> {
  return sendJson("DELETE", `/favourites/${id}`);
}
