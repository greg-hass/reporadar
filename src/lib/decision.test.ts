import { describe, expect, it } from "vitest";
import type { Repo } from "./types.js";
import { buildRepoDecisionSummary } from "./format.js";

const repo: Repo = {
  id: 42,
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
};

describe("buildRepoDecisionSummary", () => {
  it("explains positive momentum with its evidence window", () => {
    const summary = buildRepoDecisionSummary(
      repo,
      [
        { t: "2026-06-01T00:00:00.000Z", stars: 100 },
        { t: "2026-06-03T00:00:00.000Z", stars: 112 },
      ],
      30,
    );

    expect(summary).toContain("gained +12 stars");
    expect(summary).toContain("2 snapshots across 2 days");
  });

  it("does not pretend a single snapshot is a trend", () => {
    expect(buildRepoDecisionSummary(repo, [{ t: "2026-06-01T00:00:00.000Z", stars: 100 }], 30)).toContain(
      "no measured momentum yet",
    );
  });
});
