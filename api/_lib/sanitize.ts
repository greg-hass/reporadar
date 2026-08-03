import type { FavouritePatch, WatchlistStatus } from "./db.js";
import { WATCHLIST_STATUSES } from "./db.js";
import type { NormalizedRepo } from "./github.js";

const MAX_TAG_COUNT = 12;
const MAX_TAG_LENGTH = 32;
const MAX_NOTE_LENGTH = 500;

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

function sanitizeTags(value: unknown): string[] | null {
	if (!Array.isArray(value)) return null;
	const tags: string[] = [];
	for (const tag of value) {
		if (typeof tag !== "string") continue;
		const normalized = tag.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
		if (normalized && !tags.includes(normalized)) tags.push(normalized);
	}
	return tags.slice(0, MAX_TAG_COUNT);
}

function isWatchlistStatus(value: unknown): value is WatchlistStatus {
	return (
		typeof value === "string" &&
		WATCHLIST_STATUSES.includes(value as WatchlistStatus)
	);
}

export function sanitizeFavouritePatch(input: unknown): FavouritePatch | null {
	if (typeof input !== "object" || input === null) return null;
	const body = input as Record<string, unknown>;
	const patch: FavouritePatch = {};
	let hasValue = false;

	if ("tags" in body) {
		const tags = sanitizeTags(body.tags);
		if (!tags) return null;
		patch.tags = tags;
		hasValue = true;
	}
	if ("note" in body) {
		if (typeof body.note !== "string") return null;
		patch.note = body.note.trim().slice(0, MAX_NOTE_LENGTH);
		hasValue = true;
	}
	if ("status" in body) {
		if (!isWatchlistStatus(body.status)) return null;
		patch.status = body.status;
		hasValue = true;
	}
	if ("telegramEnabled" in body) {
		if (typeof body.telegramEnabled !== "boolean") return null;
		patch.telegramEnabled = body.telegramEnabled;
		hasValue = true;
	}
	if ("alertThreshold" in body) {
		if (
			typeof body.alertThreshold !== "number" ||
			!Number.isFinite(body.alertThreshold) ||
			body.alertThreshold < 1
		) {
			return null;
		}
		patch.alertThreshold = Math.min(Math.floor(body.alertThreshold), 1_000_000);
		hasValue = true;
	}

	return hasValue ? patch : null;
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
