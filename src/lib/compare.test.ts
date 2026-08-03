import { describe, expect, it } from "vitest";
import type { Repo } from "./types.js";
import { buildCompareSummary } from "./compare.js";

function repo(overrides: Partial<Repo>): Repo {
  return {
    id: 1,
    fullName: "owner/repo",
    description: "A repository",
    language: "TypeScript",
    topics: [],
    starsTotal: 100,
    forks: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    pushedAt: "2026-06-01T00:00:00.000Z",
    license: "MIT",
    ownerAvatar: "https://example.com/avatar.png",
    htmlUrl: "https://github.com/owner/repo",
    ...overrides,
  };
}

describe("buildCompareSummary", () => {
  it("recommends measured momentum while naming size and activity evidence", () => {
    const summary = buildCompareSummary([
      repo({ id: 1, fullName: "owner/steady", starDelta: 4, starsTotal: 500 }),
      repo({
        id: 2,
        fullName: "owner/rising",
        starDelta: 12,
        starsTotal: 200,
        pushedAt: "2026-06-30T00:00:00.000Z",
      }),
    ]);

    expect(summary.headline).toBe("For a momentum-first pick, start with owner/rising.");
    expect(summary.evidence).toContain("owner/rising leads measured momentum at +12 stars.");
    expect(summary.evidence).toContain("owner/steady has the largest existing audience at 500 stars.");
    expect(summary.evidence).toContain("owner/rising was pushed most recently.");
  });

  it("falls back to activity when no candidate has tracked momentum", () => {
    const summary = buildCompareSummary([
      repo({ id: 1, fullName: "owner/old", pushedAt: "2026-05-01T00:00:00.000Z" }),
      repo({ id: 2, fullName: "owner/new", pushedAt: "2026-06-30T00:00:00.000Z" }),
    ]);

    expect(summary.headline).toBe(
      "For a first pass, start with owner/new, the most recently active candidate.",
    );
    expect(summary.evidence).toContain("None of these candidates has enough tracking history");
  });
});
