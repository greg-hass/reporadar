const GITHUB_API = "https://api.github.com";

interface GhRepo {
  id: number;
  full_name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  pushed_at: string;
  license: { spdx_id: string } | null;
  owner: { avatar_url: string; html_url: string };
  html_url: string;
}

export interface NormalizedRepo {
  id: number;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  starsTotal: number;
  forks: number;
  createdAt: string;
  pushedAt: string;
  license: string | null;
  ownerAvatar: string;
  htmlUrl: string;
}

function normalize(r: GhRepo): NormalizedRepo {
  return {
    id: r.id,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    topics: r.topics ?? [],
    starsTotal: r.stargazers_count,
    forks: r.forks_count,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    license: r.license?.spdx_id ?? null,
    ownerAvatar: r.owner.avatar_url,
    htmlUrl: r.html_url,
  };
}

export interface SearchQuery {
  q: string;
  language?: string;
  topics?: string[];
  minStars?: number;
  createdSinceDays?: number;
  sort?: string;
  page?: number;
}

export async function githubSearch(
  query: SearchQuery,
  token: string
): Promise<{ items: NormalizedRepo[]; total: number }> {
  const parts: string[] = [query.q];
  if (query.language) parts.push(`language:${query.language}`);
  for (const t of query.topics ?? []) parts.push(`topic:${t}`);
  if (query.minStars) parts.push(`stars:>=${query.minStars}`);
  if (query.createdSinceDays) {
    const since = new Date(Date.now() - query.createdSinceDays * 86400_000).toISOString().slice(0, 10);
    parts.push(`created:>=${since}`);
  }
  const q = encodeURIComponent(parts.join(" "));
  const sort = query.sort && query.sort !== "best-match" ? `&sort=${encodeURIComponent(query.sort)}` : "";
  const page = query.page ? `&page=${query.page}` : "";
  const url = `${GITHUB_API}/search/repositories?q=${q}&per_page=30${sort}${page}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { total_count: number; items: GhRepo[] };
  return { items: json.items.map(normalize), total: json.total_count };
}
