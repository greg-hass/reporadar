export interface Repo {
	id: number;
	fullName: string;
	description: string | null;
	language: string | null;
	topics: string[];
	starsTotal: number;
	forks: number;
	createdAt: string; // ISO
	pushedAt: string; // ISO
	license: string | null;
	ownerAvatar: string;
	htmlUrl: string;
	/** stars gained over the riser window; null when not tracked */
	starDelta?: number | null;
	/** recent snapshot points for the sparkline; null when not tracked */
	history?: number[] | null;
}

export type SortKey = "stars" | "updated" | "best-match" | "risers";

export interface Stats {
	reposTracked: number;
	snapshotsToday: number;
	starsGainedToday: number;
	snapshotCount: number;
	trackedSince: string | null; // ISO
	lastSnapshotAt: string | null; // ISO
}

export interface AlertStatus {
	telegramConfigured: boolean;
	quietHoursConfigured: boolean;
}

export type WatchlistStatus = "watching" | "building" | "paused" | "archived";

export interface WatchlistMeta {
	tags: string[];
	note: string;
	status: WatchlistStatus;
	telegramEnabled: boolean;
	alertThreshold: number;
}

export type WatchlistPatch = Partial<WatchlistMeta>;

export type WatchlistRepo = Repo & {
	watchlist: WatchlistMeta;
};

export type PulseItemKind = "watchlist-change" | "new-signal";

export interface PulseItem {
	repo: Repo;
	kind: PulseItemKind;
	starDelta: number;
	snapshotCount: number;
	trackedSince: string;
	lastSnapshotAt: string;
	isFavourite: boolean;
}

export interface PulseResponse {
	items: PulseItem[];
	since: string;
	generatedAt: string;
	stats: Stats;
}

export interface HistoryPoint {
	t: string; // ISO
	stars: number;
}

export interface SearchParams {
	q: string;
	language?: string;
	topics?: string[];
	minStars?: number;
	createdSinceDays?: number;
	pushedSinceDays?: number;
	sort?: SortKey;
	page?: number;
}
