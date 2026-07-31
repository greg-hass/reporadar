const GITHUB_API = "https://api.github.com";

const HEADERS = (token: string) => ({
	...(token ? { Authorization: `Bearer ${token}` } : {}),
	Accept: "application/vnd.github+json",
	"X-GitHub-Api-Version": "2022-11-28",
});

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
	token: string,
): Promise<{ items: NormalizedRepo[]; total: number }> {
	const parts: string[] = [query.q];
	if (query.language) parts.push(`language:${query.language}`);
	for (const t of query.topics ?? []) parts.push(`topic:${t}`);
	if (query.minStars) parts.push(`stars:>=${query.minStars}`);
	if (query.createdSinceDays) {
		const since = new Date(Date.now() - query.createdSinceDays * 86400_000)
			.toISOString()
			.slice(0, 10);
		parts.push(`created:>=${since}`);
	}
	const q = encodeURIComponent(parts.join(" "));
	const sort =
		query.sort && query.sort !== "best-match"
			? `&sort=${encodeURIComponent(query.sort)}`
			: "";
	const page = query.page ? `&page=${query.page}` : "";
	const url = `${GITHUB_API}/search/repositories?q=${q}&per_page=30${sort}${page}`;

	const res = await fetch(url, { headers: HEADERS(token) });
	if (!res.ok) {
		throw new Error(`GitHub ${res.status}: ${await res.text()}`);
	}
	const json = (await res.json()) as { total_count: number; items: GhRepo[] };
	return { items: json.items.map(normalize), total: json.total_count };
}

/** Fetches a single repo by owner/name. */
export async function githubRepo(
	owner: string,
	name: string,
	token: string,
): Promise<NormalizedRepo> {
	const res = await fetch(
		`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
		{
			headers: HEADERS(token),
		},
	);
	if (!res.ok) {
		throw new Error(`GitHub ${res.status}: ${await res.text()}`);
	}
	return normalize((await res.json()) as GhRepo);
}

/** Fetches a single repo by its numeric GitHub id (used to refresh favourites). */
export async function githubRepoById(
	id: number,
	token: string,
): Promise<NormalizedRepo> {
	const res = await fetch(`${GITHUB_API}/repositories/${id}`, {
		headers: HEADERS(token),
	});
	if (!res.ok) {
		throw new Error(`GitHub ${res.status}: ${await res.text()}`);
	}
	return normalize((await res.json()) as GhRepo);
}

/** Rewrites relative src/href/srcset URLs to absolute raw/github URLs for the repo's default branch. */
export function absolutizeUrls(
	html: string,
	owner: string,
	name: string,
): string {
	const rawBase = `https://raw.githubusercontent.com/${owner}/${name}/HEAD/`;
	const blobBase = `https://github.com/${owner}/${name}/blob/HEAD/`;
	const repoPrefix = `${owner}/${name}/`;
	const resolve = (base: string, p: string): string => {
		if (/^(https?:)?\/\//.test(p) || p.startsWith("#") || p.startsWith("data:"))
			return p;
		let rel = p.replace(/^\.\//, "");
		if (rel.startsWith("/")) rel = rel.slice(1);
		if (rel.startsWith(repoPrefix)) rel = rel.slice(repoPrefix.length);
		return base + rel;
	};
	return html
		.replace(
			/(src\s*=\s*")([^"]+)(")/g,
			(_m, pre: string, p: string, post: string) =>
				pre + resolve(rawBase, p) + post,
		)
		.replace(
			/(href\s*=\s*")([^"]+)(")/g,
			(_m, pre: string, p: string, post: string) =>
				pre + resolve(blobBase, p) + post,
		)
		.replace(
			/(srcset\s*=\s*")([^"]+)(")/g,
			(_m, pre: string, p: string, post: string) =>
				pre +
				p
					.split(",")
					.map((c) => {
						const [u, d] = c.trim().split(/\s+/);
						return resolve(rawBase, u) + (d ? " " + d : "");
					})
					.join(", ") +
				post,
		);
}

/** Fetches the README as GitHub-rendered HTML (relative URLs absolutized). Null when absent. */
export async function githubReadme(
	owner: string,
	name: string,
	token: string,
): Promise<string | null> {
	const res = await fetch(
		`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`,
		{
			headers: { ...HEADERS(token), Accept: "application/vnd.github.html" },
		},
	);
	if (res.status === 404) return null;
	if (!res.ok) {
		throw new Error(`GitHub ${res.status}: ${await res.text()}`);
	}
	return absolutizeUrls(await res.text(), owner, name);
}
