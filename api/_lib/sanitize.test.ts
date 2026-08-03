import { describe, expect, it } from "vitest";
import { sanitizeFavouritePatch, sanitizeFavouritePayload } from "./sanitize";

const benign = {
	id: 42,
	fullName: "greg-hass/reporadar",
	description: "A dashboard",
	language: "TypeScript",
	topics: ["github", "react"],
	starsTotal: 12,
	forks: 2,
	createdAt: "2026-01-01T00:00:00Z",
	pushedAt: "2026-01-02T00:00:00Z",
	license: "MIT",
	ownerAvatar: "https://example.com/avatar.png",
	htmlUrl: "https://github.com/greg-hass/reporadar",
};

describe("sanitizeFavouritePayload", () => {
	it("keeps a benign payload intact", () => {
		const out = sanitizeFavouritePayload(benign, 42);
		expect(out).toEqual({
			id: 42,
			fullName: "greg-hass/reporadar",
			description: "A dashboard",
			language: "TypeScript",
			topics: ["github", "react"],
			starsTotal: 12,
			forks: 2,
			createdAt: "2026-01-01T00:00:00Z",
			pushedAt: "2026-01-02T00:00:00Z",
			license: "MIT",
			ownerAvatar: "https://example.com/avatar.png",
			htmlUrl: "https://github.com/greg-hass/reporadar",
		});
	});

	it("derives htmlUrl from fullName, ignoring a javascript: link", () => {
		const out = sanitizeFavouritePayload(
			{ ...benign, htmlUrl: "javascript:alert(1)" },
			42,
		);
		expect(out?.htmlUrl).toBe("https://github.com/greg-hass/reporadar");
	});

	it("falls back to the GitHub avatar URL when ownerAvatar is not http(s)", () => {
		const out = sanitizeFavouritePayload(
			{ ...benign, ownerAvatar: "javascript:alert(1)" },
			42,
		);
		expect(out?.ownerAvatar).toBe("https://github.com/greg-hass.png");
	});

	it("uses the route id as authoritative even when the body disagrees", () => {
		const out = sanitizeFavouritePayload({ ...benign, id: 999 }, 42);
		expect(out?.id).toBe(42);
	});

	it("rejects payloads without a valid owner/name fullName", () => {
		expect(
			sanitizeFavouritePayload({ ...benign, fullName: "no-slash" }, 42),
		).toBeNull();
		expect(
			sanitizeFavouritePayload({ ...benign, fullName: "a/b/c" }, 42),
		).toBeNull();
		expect(
			sanitizeFavouritePayload({ ...benign, fullName: "bad name/owner" }, 42),
		).toBeNull();
		expect(
			sanitizeFavouritePayload({ ...benign, fullName: 123 }, 42),
		).toBeNull();
		expect(sanitizeFavouritePayload(null, 42)).toBeNull();
		expect(sanitizeFavouritePayload("string", 42)).toBeNull();
	});

	it("clamps numeric fields and drops negative/NaN values", () => {
		const out = sanitizeFavouritePayload(
			{
				...benign,
				starsTotal: -5,
				forks: Number.NaN,
				description: "x".repeat(5000),
			},
			42,
		);
		expect(out?.starsTotal).toBe(0);
		expect(out?.forks).toBe(0);
		expect(out?.description?.length).toBe(1000);
	});

	it("caps topics count and per-topic length, dropping non-strings", () => {
		const out = sanitizeFavouritePayload(
			{
				...benign,
				topics: [
					"a".repeat(500),
					7,
					null,
					...Array.from({ length: 30 }, (_, i) => `topic-${i}`),
				],
			},
			42,
		);
		expect(out?.topics.length).toBe(20);
		expect(out?.topics[0].length).toBe(100);
		expect(out?.topics.some((t) => typeof t !== "string")).toBe(false);
	});

	it("drops unknown extra fields entirely", () => {
		const out = sanitizeFavouritePayload(
			{ ...benign, evil: "payload", extraNested: { x: 1 } },
			42,
		);
		const keys = Object.keys(out as object).sort();
		expect(keys).toEqual(
			[
				"createdAt",
				"description",
				"forks",
				"fullName",
				"htmlUrl",
				"id",
				"language",
				"license",
				"ownerAvatar",
				"pushedAt",
				"starsTotal",
				"topics",
			].sort(),
		);
	});
});

describe("sanitizeFavouritePatch", () => {
	it("normalizes watchlist metadata and clamps its shape", () => {
		const out = sanitizeFavouritePatch({
			tags: [" Frontend ", "frontend", "", "INFRA"],
			note: ` ${"x".repeat(600)} `,
			status: "building",
			telegramEnabled: true,
			alertThreshold: 75.8,
		});

		expect(out).toEqual({
			tags: ["frontend", "infra"],
			note: "x".repeat(500),
			status: "building",
			telegramEnabled: true,
			alertThreshold: 75,
		});
	});

	it("rejects invalid metadata fields instead of partially accepting them", () => {
		expect(sanitizeFavouritePatch({ status: "unknown" })).toBeNull();
		expect(sanitizeFavouritePatch({ tags: "infra" })).toBeNull();
		expect(sanitizeFavouritePatch({ note: 42 })).toBeNull();
		expect(sanitizeFavouritePatch({ telegramEnabled: "yes" })).toBeNull();
		expect(sanitizeFavouritePatch({ alertThreshold: 0 })).toBeNull();
		expect(sanitizeFavouritePatch({})).toBeNull();
	});
});
