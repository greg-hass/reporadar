import { beforeEach, describe, expect, it, vi } from "vitest";

const clientQuery = vi.hoisted(() => vi.fn().mockResolvedValue({ rows: [] }));
const clientConnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const clientEnd = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("pg", () => ({
  Client: vi.fn(() => ({ connect: clientConnect, query: clientQuery, end: clientEnd })),
  types: { builtins: { INT8: 20 }, setTypeParser: vi.fn() },
}));

import { upsertAndSnapshot } from "./db";
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
  clientConnect.mockClear();
  clientEnd.mockClear();
});

describe("Postgres storage", () => {
  it("wraps snapshot writes in a transaction", async () => {
    await upsertAndSnapshot([repo], "postgres://postgres:postgres@db:5432/reporadar");

    expect(clientConnect).toHaveBeenCalledOnce();
    expect(clientEnd).toHaveBeenCalledOnce();
    const sqls = clientQuery.mock.calls.map((call: unknown[]) => String(call[0]).replace(/\s+/g, " ").trim());
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls[1]).toMatch(/^INSERT INTO repos /);
    expect(sqls[2]).toMatch(/^INSERT INTO star_snapshots /);
    expect(sqls[3]).toBe("COMMIT");
  });
});
