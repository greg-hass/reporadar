import type { NormalizedRepo } from "./github.js";

/**
 * Favourites arrive as an unauthenticated PUT body, so the server must not
 * trust them. This builds a canonical NormalizedRepo from a client payload:
 * every field is re-derived or clamped, and anything that is rendered as a
 * link or an image source is forced to a safe value.
 *
 * Returns null when the payload is unusable (not an object, or a fullName
 * that doesn't look like `owner/name`).
 */
const FULL_NAME_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MAX_DESCRIPTION = 1000;
const MAX_TEXT = 50;
const MAX_TOPIC_COUNT = 20;
const MAX_TOPIC_LENGTH = 100;
const MAX_STARS = 1_000_000_000;

function asText(value: unknown, max: number): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed.slice(0, max);
}

function asNonNegativeInt(value: unknown, max: number): number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? Math.min(Math.floor(value), max)
		: 0;
}

function asHttpUrl(value: unknown, fallback: string): string {
	if (typeof value === "string") {
		try {
			const url = new URL(value);
			if (url.protocol === "https:" || url.protocol === "http:") {
				return url.toString();
			}
		} catch {
			// not a URL — fall through to the fallback
		}
	}
	return fallback;
}

function sanitizeTopics(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	return value
		.filter((topic): topic is string => typeof topic === "string")
		.map((topic) => topic.slice(0, MAX_TOPIC_LENGTH))
		.slice(0, MAX_TOPIC_COUNT);
}

export function sanitizeFavouritePayload(
	input: unknown,
	id: number,
): NormalizedRepo | null {
	if (typeof input !== "object" || input === null) return null;
	const body = input as Record<string, unknown>;

	const fullName = asText(body.fullName, 200);
	if (!fullName || !FULL_NAME_RE.test(fullName)) return null;

	const owner = fullName.split("/")[0];
	const nowIso = new Date().toISOString();
	const topics = sanitizeTopics(body.topics);

	return {
		id,
		fullName,
		description: asText(body.description, MAX_DESCRIPTION),
		language: asText(body.language, MAX_TEXT),
		topics,
		starsTotal: asNonNegativeInt(body.starsTotal, MAX_STARS),
		forks: asNonNegativeInt(body.forks, MAX_STARS),
		createdAt: asText(body.createdAt, 40) ?? nowIso,
		pushedAt: asText(body.pushedAt, 40) ?? nowIso,
		license: asText(body.license, MAX_TEXT),
		ownerAvatar: asHttpUrl(body.ownerAvatar, `https://github.com/${owner}.png`),
		// The one field that becomes an href in the UI — never trust the client.
		htmlUrl: `https://github.com/${fullName}`,
	};
}
