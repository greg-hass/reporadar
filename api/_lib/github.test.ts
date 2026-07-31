import { afterEach, describe, expect, it, vi } from "vitest";
import { absolutizeUrls, githubSearch } from "./github";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("absolutizeUrls", () => {
	it("resolves README-relative assets without touching absolute URLs or anchors", () => {
		const html =
			'<img src="./images/logo.png"><a href="docs/guide.md">Guide</a><a href="#install">Install</a><img src="https://example.com/logo.png">';
		expect(absolutizeUrls(html, "greg-hass", "reporadar")).toBe(
			'<img src="https://raw.githubusercontent.com/greg-hass/reporadar/HEAD/images/logo.png"><a href="https://github.com/greg-hass/reporadar/blob/HEAD/docs/guide.md">Guide</a><a href="#install">Install</a><img src="https://example.com/logo.png">',
		);
	});
});

describe("githubSearch", () => {
	it("supports anonymous lite-mode requests without an empty bearer token", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					total_count: 1,
					items: [
						{
							id: 42,
							full_name: "greg-hass/reporadar",
							description: "A dashboard",
							language: "TypeScript",
							topics: ["github"],
							stargazers_count: 12,
							forks_count: 2,
							created_at: "2026-01-01T00:00:00Z",
							pushed_at: "2026-01-02T00:00:00Z",
							license: { spdx_id: "MIT" },
							owner: {
								avatar_url: "https://example.com/avatar.png",
								html_url: "https://github.com/greg-hass",
							},
							html_url: "https://github.com/greg-hass/reporadar",
						},
					],
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await githubSearch(
			{ q: "stars:>50", createdSinceDays: 7 },
			"",
		);

		expect(result.items[0]?.fullName).toBe("greg-hass/reporadar");
		const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(request.headers).toEqual({
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		});
	});
});
