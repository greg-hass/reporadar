import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useFavouriteIds, useToggleFavourite } from "./useFavourites";
import type { Repo } from "../lib/types";

const repo: Repo = {
	id: 42,
	fullName: "greg-hass/reporadar",
	description: "A dashboard",
	language: "TypeScript",
	topics: [],
	starsTotal: 12,
	forks: 2,
	createdAt: "2026-01-01T00:00:00Z",
	pushedAt: "2026-01-02T00:00:00Z",
	license: "MIT",
	ownerAvatar: "https://example.com/avatar.png",
	htmlUrl: "https://github.com/greg-hass/reporadar",
};

/**
 * A fetch mock that mirrors the server's favourites state: PUT adds the id,
 * DELETE removes it, GET reports the current list. This matters because the
 * hook invalidates the ids query after every mutation, so the refetched data
 * must reflect the mutation like a real server would.
 */
function statefulMock(initialIds: number[], failPut = false) {
	let ids = [...initialIds];
	const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input), "http://localhost");
		const method = (init?.method ?? "GET").toUpperCase();
		if (method === "GET" && url.pathname === "/api/favourites/ids") {
			return new Response(JSON.stringify({ ids }));
		}
		const match = url.pathname.match(/^\/api\/favourites\/(\d+)$/);
		if (match) {
			const id = Number(match[1]);
			if (method === "PUT" && failPut) {
				return new Response(JSON.stringify({ error: "boom" }), {
					status: 500,
				});
			}
			if (method === "PUT") {
				if (!ids.includes(id)) ids.push(id);
				return new Response(JSON.stringify({ ok: true }));
			}
			if (method === "DELETE") {
				ids = ids.filter((existing) => existing !== id);
				return new Response(JSON.stringify({ ok: true }));
			}
		}
		return new Response(
			JSON.stringify({ error: `unhandled ${method} ${url.pathname}` }),
			{ status: 404 },
		);
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function makeClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
}

function wrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useFavouriteIds", () => {
	it("fetches the stored ids", async () => {
		const fetchMock = statefulMock([1, 2]);
		const { result } = renderHook(() => useFavouriteIds(), {
			wrapper: wrapper(makeClient()),
		});

		await waitFor(() => expect(result.current.data).toEqual({ ids: [1, 2] }));
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/api/favourites/ids"),
		);
	});
});

describe("useToggleFavourite", () => {
	it("PUTs the repo when favouriting, updating the id list", async () => {
		statefulMock([]);
		const client = makeClient();
		const ids = renderHook(() => useFavouriteIds(), { wrapper: wrapper(client) });
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [] }));

		const toggle = renderHook(() => useToggleFavourite(), {
			wrapper: wrapper(client),
		});
		let putBody: string | null = null;
		// capture what the mutation sends on the wire
		const realFetch = vi.mocked(fetch);
		act(() => toggle.result.current.mutate({ repo, fav: false }));

		await waitFor(() => expect(toggle.result.current.isSuccess).toBe(true));
		putBody = String(realFetch.mock.calls.find(([, init]) => init?.method === "PUT")?.[1]?.body ?? null);
		expect(putBody).toBe(JSON.stringify(repo));
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [42] }));
	});

	it("optimistically adds the id before the PUT resolves", async () => {
		statefulMock([]);
		const client = makeClient();
		const ids = renderHook(() => useFavouriteIds(), { wrapper: wrapper(client) });
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [] }));

		const toggle = renderHook(() => useToggleFavourite(), {
			wrapper: wrapper(client),
		});
		act(() => toggle.result.current.mutate({ repo, fav: false }));

		// The optimistic update lands before the request settles.
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [42] }));
	});

	it("DELETEs when un-favouriting, removing the id", async () => {
		statefulMock([42]);
		const client = makeClient();
		const ids = renderHook(() => useFavouriteIds(), { wrapper: wrapper(client) });
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [42] }));

		const toggle = renderHook(() => useToggleFavourite(), {
			wrapper: wrapper(client),
		});
		act(() => toggle.result.current.mutate({ repo, fav: true }));

		await waitFor(() => expect(toggle.result.current.isSuccess).toBe(true));
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [] }));
	});

	it("rolls back the optimistic id when the request fails", async () => {
		statefulMock([], true); // PUT fails
		const client = makeClient();
		const ids = renderHook(() => useFavouriteIds(), { wrapper: wrapper(client) });
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [] }));

		const toggle = renderHook(() => useToggleFavourite(), {
			wrapper: wrapper(client),
		});
		act(() => toggle.result.current.mutate({ repo, fav: false }));

		// Optimistic add, then rollback once the PUT errors.
		await waitFor(() => expect(toggle.result.current.isError).toBe(true));
		await waitFor(() => expect(ids.result.current.data).toEqual({ ids: [] }));
	});
});
