import { beforeEach, describe, expect, it, vi } from "vitest";

const clientQuery = vi.hoisted(() => vi.fn().mockResolvedValue({ rows: [] }));
const clientRelease = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const poolQuery = vi.hoisted(() => vi.fn().mockResolvedValue({ rows: [] }));
const poolConnect = vi.hoisted(() =>
	vi.fn().mockResolvedValue({ query: clientQuery, release: clientRelease }),
);

vi.mock("pg", () => ({
	Pool: vi.fn(() => ({
		query: poolQuery,
		connect: poolConnect,
	})),
	types: { builtins: { INT8: 20 }, setTypeParser: vi.fn() },
}));

import { queryRepoByName, upsertAndSnapshot } from "./db";
import type { NormalizedRepo } from "./github";

const repo: NormalizedRepo = {
	id: 42,
	fullName: "greg-hass/reporadar",
	description: "A dashboard",
	language: "TypeScript",
	topics: ["github"],
	starsTotal: 12,
	forks: 2,
	createdAt: "2026-01-01T00:00:00Z",
	pushedAt: "2026-01-02T00:00:00Z",
	license: "MIT",
	ownerAvatar: "https://example.com/avatar.png",
	htmlUrl: "https://github.com/greg-hass/reporadar",
};

beforeEach(() => {
	clientQuery.mockReset().mockResolvedValue({ rows: [] });
	clientRelease.mockClear();
	poolQuery.mockReset().mockResolvedValue({ rows: [] });
	poolConnect.mockClear();
});

describe("Postgres storage", () => {
	it("wraps snapshot writes in a transaction on a checked-out connection", async () => {
		await upsertAndSnapshot(
			[repo],
			"postgres://postgres:postgres@db:5432/reporadar",
		);

		// The transaction path checks out one pooled connection and releases it.
		expect(poolConnect).toHaveBeenCalledOnce();
		expect(clientRelease).toHaveBeenCalledOnce();
		const sqls = clientQuery.mock.calls
			.map((call: unknown[]) => String(call[0]).replace(/\s+/g, " ").trim());
		expect(sqls[0]).toBe("BEGIN");
		expect(sqls[1]).toMatch(/^INSERT INTO repos /);
		expect(sqls[2]).toMatch(/^INSERT INTO star_snapshots /);
		expect(sqls[3]).toBe("COMMIT");
	});

	it("runs plain reads through the pool without checking out a connection", async () => {
		poolQuery.mockResolvedValueOnce({
			rows: [{ id: 42, fullName: "greg-hass/reporadar" }],
		});
		const found = await queryRepoByName(
			"postgres://postgres:postgres@db:5432/reporadar",
			"greg-hass/reporadar",
		);

		expect(found?.fullName).toBe("greg-hass/reporadar");
		expect(poolQuery).toHaveBeenCalledOnce();
		expect(poolConnect).not.toHaveBeenCalled();
	});
});
