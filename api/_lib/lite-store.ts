import fs from "node:fs";
import path from "node:path";
import type { NormalizedRepo } from "./github.js";
import type {
	AlertCandidate,
	AlertEvent,
	FavouritePatch,
	HistoryPoint,
	PulseItem,
	PulseResult,
	RepoStats,
	WatchlistMeta,
	WatchlistRepo,
	WatchlistStatus,
} from "./db.js";
import type { RepoStorage } from "./storage.js";

type Snapshot = {
	repoId: number;
	capturedAt: string;
	stars: number;
};

type FavouriteRecord = NormalizedRepo & { watchlist: WatchlistMeta };

type LiteState = {
	repos: NormalizedRepo[];
	snapshots: Snapshot[];
	favourites: FavouriteRecord[];
	alertEvents: AlertEvent[];
};

const EMPTY_STATE: LiteState = {
	repos: [],
	snapshots: [],
	favourites: [],
	alertEvents: [],
};
const MAX_SNAPSHOTS = 50_000;
const MAX_ALERT_EVENTS = 10_000;
const WATCHLIST_STATUSES: WatchlistStatus[] = [
	"watching",
	"building",
	"paused",
	"archived",
];

function defaultWatchlistMeta(): WatchlistMeta {
	return {
		tags: [],
		note: "",
		status: "watching",
		telegramEnabled: false,
		alertThreshold: 50,
	};
}

function normalizeWatchlistMeta(value: unknown): WatchlistMeta {
	if (typeof value !== "object" || value === null)
		return defaultWatchlistMeta();
	const candidate = value as Record<string, unknown>;
	const tags = Array.isArray(candidate.tags)
		? candidate.tags.filter((tag): tag is string => typeof tag === "string")
		: [];
	const status = WATCHLIST_STATUSES.includes(
		candidate.status as WatchlistStatus,
	)
		? (candidate.status as WatchlistStatus)
		: "watching";
	const threshold =
		typeof candidate.alertThreshold === "number" &&
		Number.isFinite(candidate.alertThreshold) &&
		candidate.alertThreshold >= 1
			? Math.min(Math.floor(candidate.alertThreshold), 1_000_000)
			: 50;
	return {
		tags: tags.slice(0, 12),
		note:
			typeof candidate.note === "string" ? candidate.note.slice(0, 500) : "",
		status,
		telegramEnabled: candidate.telegramEnabled === true,
		alertThreshold: threshold,
	};
}

function normalizeFavourite(value: unknown): FavouriteRecord | null {
	if (typeof value !== "object" || value === null) return null;
	const candidate = value as Record<string, unknown>;
	if (
		typeof candidate.id !== "number" ||
		typeof candidate.fullName !== "string"
	)
		return null;
	return {
		...(candidate as unknown as NormalizedRepo),
		watchlist: normalizeWatchlistMeta(candidate.watchlist),
	};
}

function normalizeAlertEvent(value: unknown): AlertEvent | null {
	if (typeof value !== "object" || value === null) return null;
	const candidate = value as Record<string, unknown>;
	if (
		typeof candidate.signature !== "string" ||
		typeof candidate.repoId !== "number" ||
		typeof candidate.snapshotAt !== "string" ||
		typeof candidate.sentAt !== "string"
	) {
		return null;
	}
	return {
		signature: candidate.signature,
		repoId: candidate.repoId,
		snapshotAt: candidate.snapshotAt,
		sentAt: candidate.sentAt,
	};
}

function cloneState(state: LiteState): LiteState {
	return {
		repos: [...state.repos],
		snapshots: [...state.snapshots],
		favourites: state.favourites.map((favourite) => ({
			...favourite,
			watchlist: {
				...favourite.watchlist,
				tags: [...favourite.watchlist.tags],
			},
		})),
		alertEvents: state.alertEvents.map((event) => ({ ...event })),
	};
}

function groupSnapshots(snapshots: Snapshot[]): Map<number, Snapshot[]> {
	const grouped = new Map<number, Snapshot[]>();
	for (const snapshot of snapshots) {
		const items = grouped.get(snapshot.repoId) ?? [];
		items.push(snapshot);
		grouped.set(snapshot.repoId, items);
	}
	return grouped;
}

function pulseItemFor(
	repo: NormalizedRepo | undefined,
	snapshots: Snapshot[],
	isFavourite: boolean,
	sinceMs: number,
): PulseItem | null {
	if (!repo) return null;
	const ordered = [...snapshots].sort((a, b) =>
		a.capturedAt.localeCompare(b.capturedAt),
	);
	const current = ordered.at(-1);
	const first = ordered[0];
	if (!current || !first || Date.parse(current.capturedAt) <= sinceMs)
		return null;

	let prior: Snapshot | undefined;
	for (let index = ordered.length - 1; index >= 0; index -= 1) {
		if (Date.parse(ordered[index].capturedAt) <= sinceMs) {
			prior = ordered[index];
			break;
		}
	}
	const starDelta = current.stars - (prior?.stars ?? current.stars);
	const isNew = Date.parse(first.capturedAt) > sinceMs;
	if (!isNew && (!isFavourite || starDelta <= 0)) return null;

	return {
		repo,
		kind: isFavourite ? "watchlist-change" : "new-signal",
		starDelta,
		snapshotCount: ordered.length,
		trackedSince: first.capturedAt,
		lastSnapshotAt: current.capturedAt,
		isFavourite,
	};
}

function comparePulseItems(a: PulseItem, b: PulseItem): number {
	return (
		Number(b.isFavourite) - Number(a.isFavourite) ||
		b.starDelta - a.starDelta ||
		b.lastSnapshotAt.localeCompare(a.lastSnapshotAt)
	);
}

// This class intentionally owns the complete file-backed store: keeping state,
// persistence, and query semantics together avoids duplicating the lite-mode
// consistency rules across several small wrappers.
// pi-lens-ignore: large-class
export class LiteStore implements RepoStorage {
	readonly mode = "lite" as const;
	private readonly filePath: string;
	private state: LiteState;

	constructor(dataDir = path.resolve(process.cwd(), "data")) {
		this.filePath = path.join(dataDir, "reporadar.json");
		this.state = this.load();
	}

	// Adapter for the RepoStorage interface; lite mode has no schema step.
	ensureSchema(): Promise<void> {
		return Promise.resolve();
	}

	async upsertAndSnapshot(repos: NormalizedRepo[]): Promise<void> {
		if (!repos.length) return;

		const capturedAt = new Date().toISOString();
		const reposById = new Map(this.state.repos.map((repo) => [repo.id, repo]));
		const snapshots = this.state.snapshots.filter(
			(snapshot) =>
				!repos.some(
					(repo) =>
						snapshot.repoId === repo.id && snapshot.capturedAt === capturedAt,
				),
		);

		for (const repo of repos) {
			reposById.set(repo.id, repo);
			snapshots.push({ repoId: repo.id, capturedAt, stars: repo.starsTotal });
		}

		this.state = {
			...this.state,
			repos: [...reposById.values()],
			snapshots: snapshots.slice(-MAX_SNAPSHOTS),
		};
		await this.persist();
	}

	queryRisers(
		windowDays: number,
		limit: number,
		offset = 0,
	): Promise<{
		items: (NormalizedRepo & { starDelta: number; history: number[] })[];
		total: number;
	}> {
		const latest = this.latestSnapshots();
		const cutoff = Date.now() - windowDays * 86_400_000;
		const repos = new Map(this.state.repos.map((repo) => [repo.id, repo]));
		const rows = [...latest.entries()]
			.map(([repoId, current]) => {
				const past = this.state.snapshots
					.filter(
						(snapshot) =>
							snapshot.repoId === repoId &&
							Date.parse(snapshot.capturedAt) >= cutoff,
					)
					.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))[0];
				const repo = repos.get(repoId);
				return repo
					? {
							...repo,
							starDelta: current.stars - (past?.stars ?? current.stars),
							history: this.historyFor(repoId, 7),
						}
					: null;
			})
			.filter(
				(
					repo,
				): repo is NormalizedRepo & { starDelta: number; history: number[] } =>
					repo !== null,
			)
			.sort((a, b) => b.starDelta - a.starDelta || b.starsTotal - a.starsTotal);

		return Promise.resolve({
			items: rows.slice(offset, offset + limit),
			total: rows.length,
		});
	}

	queryStats(): Promise<RepoStats> {
		const today = new Date().toISOString().slice(0, 10);
		const todays = this.state.snapshots.filter(
			(snapshot) => snapshot.capturedAt.slice(0, 10) === today,
		);
		const byRepo = new Map<number, number[]>();
		for (const snapshot of todays) {
			const points = byRepo.get(snapshot.repoId) ?? [];
			points.push(snapshot.stars);
			byRepo.set(snapshot.repoId, points);
		}

		const starsGainedToday = [...byRepo.values()].reduce(
			(total, points) => total + Math.max(...points) - Math.min(...points),
			0,
		);
		const snapshotTimes = this.state.snapshots
			.map((snapshot) => snapshot.capturedAt)
			.sort((a, b) => a.localeCompare(b));
		const lastSnapshotAt = snapshotTimes.at(-1) ?? null;

		return Promise.resolve({
			reposTracked: this.state.repos.length,
			snapshotsToday: todays.length,
			starsGainedToday,
			snapshotCount: this.state.snapshots.length,
			trackedSince: snapshotTimes[0] ?? null,
			lastSnapshotAt,
		});
	}

	async queryPulse(since: string, limit = 12): Promise<PulseResult> {
		const parsedSince = Date.parse(since);
		const sinceMs = Number.isFinite(parsedSince)
			? parsedSince
			: Date.now() - 86_400_000;
		const normalizedSince = new Date(sinceMs).toISOString();
		const repos = new Map(this.state.repos.map((repo) => [repo.id, repo]));
		for (const favourite of this.state.favourites) {
			if (!repos.has(favourite.id)) repos.set(favourite.id, favourite);
		}
		const favourites = new Set(this.state.favourites.map((repo) => repo.id));
		const snapshotsByRepo = groupSnapshots(this.state.snapshots);
		const items = [...snapshotsByRepo.entries()]
			.map(([repoId, snapshots]) =>
				pulseItemFor(
					repos.get(repoId),
					snapshots,
					favourites.has(repoId),
					sinceMs,
				),
			)
			.filter((item): item is PulseItem => item !== null)
			.sort(comparePulseItems)
			.slice(0, Math.max(1, limit));

		return {
			items,
			since: normalizedSince,
			generatedAt: new Date().toISOString(),
			stats: await this.queryStats(),
		};
	}

	async queryHistory(repoId: number, days: number): Promise<HistoryPoint[]> {
		return this.state.snapshots
			.filter(
				(snapshot) =>
					snapshot.repoId === repoId &&
					Date.parse(snapshot.capturedAt) >= Date.now() - days * 86_400_000,
			)
			.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
			.map((snapshot) => ({ t: snapshot.capturedAt, stars: snapshot.stars }));
	}

	async queryRepoByName(fullName: string): Promise<NormalizedRepo | null> {
		return this.state.repos.find((repo) => repo.fullName === fullName) ?? null;
	}

	async listFavouriteIds(): Promise<number[]> {
		return this.state.favourites.map((repo) => repo.id);
	}

	async addFavourite(repo: NormalizedRepo): Promise<void> {
		if (!this.state.favourites.some((favourite) => favourite.id === repo.id)) {
			this.state = {
				...this.state,
				favourites: [
					...this.state.favourites,
					{ ...repo, watchlist: defaultWatchlistMeta() },
				],
			};
			await this.persist();
		}
	}

	async removeFavourite(repoId: number): Promise<void> {
		this.state = {
			...this.state,
			favourites: this.state.favourites.filter((repo) => repo.id !== repoId),
		};
		await this.persist();
	}

	async updateFavourites(
		repoIds: number[],
		patch: FavouritePatch,
	): Promise<void> {
		if (!repoIds.length) return;
		const selected = new Set(repoIds);
		this.state = {
			...this.state,
			favourites: this.state.favourites.map((favourite) =>
				selected.has(favourite.id)
					? {
							...favourite,
							watchlist: {
								...favourite.watchlist,
								...patch,
								tags: patch.tags ? [...patch.tags] : favourite.watchlist.tags,
							},
						}
					: favourite,
			),
		};
		await this.persist();
	}

	queryAlertCandidates(): Promise<AlertCandidate[]> {
		const repos = new Map(this.state.repos.map((repo) => [repo.id, repo]));
		const candidates = this.state.favourites
			.filter(
				(favourite) =>
					favourite.watchlist.telegramEnabled &&
					favourite.watchlist.status !== "paused" &&
					favourite.watchlist.status !== "archived",
			)
			.map((favourite) => {
				const ordered = this.state.snapshots
					.filter((snapshot) => snapshot.repoId === favourite.id)
					.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
				const current = ordered.at(-1);
				const previous = ordered.at(-2);
				if (!current) return null;
				const starDelta = current.stars - (previous?.stars ?? current.stars);
				if (starDelta < favourite.watchlist.alertThreshold) return null;
				return {
					repo: repos.get(favourite.id) ?? favourite,
					starDelta,
					snapshotAt: current.capturedAt,
					previousSnapshotAt: previous?.capturedAt ?? null,
					watchlist: favourite.watchlist,
				};
			})
			.filter((candidate): candidate is AlertCandidate => candidate !== null);
		return Promise.resolve(candidates);
	}

	hasAlertEvent(signature: string): Promise<boolean> {
		return Promise.resolve(
			this.state.alertEvents.some((event) => event.signature === signature),
		);
	}

	async recordAlertEvent(
		event: Pick<AlertEvent, "signature" | "repoId" | "snapshotAt">,
	): Promise<void> {
		if (
			this.state.alertEvents.some((item) => item.signature === event.signature)
		)
			return;
		this.state = {
			...this.state,
			alertEvents: [
				...this.state.alertEvents,
				{ ...event, sentAt: new Date().toISOString() },
			].slice(-MAX_ALERT_EVENTS),
		};
		await this.persist();
	}

	queryFavourites(windowDays: number): Promise<WatchlistRepo[]> {
		const latest = this.latestSnapshots();
		const cutoff = Date.now() - windowDays * 86_400_000;
		return Promise.resolve(
			this.state.favourites.map((favourite) => {
				const current = latest.get(favourite.id);
				const past = this.state.snapshots
					.filter(
						(snapshot) =>
							snapshot.repoId === favourite.id &&
							Date.parse(snapshot.capturedAt) >= cutoff,
					)
					.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))[0];
				const repo = this.state.repos.find(
					(candidate) => candidate.id === favourite.id,
				);
				return {
					...(repo ?? favourite),
					starDelta: current
						? current.stars - (past?.stars ?? current.stars)
						: null,
					history: this.historyFor(favourite.id, 7),
					watchlist: favourite.watchlist,
				};
			}),
		);
	}

	private latestSnapshots(): Map<number, Snapshot> {
		const latest = new Map<number, Snapshot>();
		for (const snapshot of this.state.snapshots) {
			const current = latest.get(snapshot.repoId);
			if (!current || snapshot.capturedAt > current.capturedAt)
				latest.set(snapshot.repoId, snapshot);
		}
		return latest;
	}

	private historyFor(repoId: number, days: number): number[] {
		const cutoff = Date.now() - days * 86_400_000;
		return this.state.snapshots
			.filter(
				(snapshot) =>
					snapshot.repoId === repoId &&
					Date.parse(snapshot.capturedAt) >= cutoff,
			)
			.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
			.map((snapshot) => snapshot.stars);
	}

	private load(): LiteState {
		try {
			const parsed = JSON.parse(
				fs.readFileSync(this.filePath, "utf8"),
			) as Partial<LiteState>;
			const rawFavourites: unknown = parsed.favourites;
			const favourites = Array.isArray(rawFavourites)
				? rawFavourites
						.map(normalizeFavourite)
						.filter(
							(favourite): favourite is FavouriteRecord => favourite !== null,
						)
				: [];
			const rawAlertEvents: unknown = parsed.alertEvents;
			const alertEvents = Array.isArray(rawAlertEvents)
				? rawAlertEvents
						.map(normalizeAlertEvent)
						.filter((event): event is AlertEvent => event !== null)
				: [];
			return {
				repos: Array.isArray(parsed.repos) ? parsed.repos : [],
				snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
				favourites,
				alertEvents,
			};
		} catch {
			return cloneState(EMPTY_STATE);
		}
	}

	// Serializes writes through a promise chain. Without this, two concurrent
	// mutations (hourly cron + a favourite toggle) both write to the same .tmp
	// file and the last rename wins — losing the other mutation's changes.
	private writeChain: Promise<void> = Promise.resolve();

	private persist(): Promise<void> {
		const write = this.writeChain.then(() => this.writeState());
		// Keep the chain alive even when a write fails; the caller still sees
		// the rejection through `write`.
		this.writeChain = write.catch(() => {});
		return write;
	}

	private async writeState(): Promise<void> {
		await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
		const temporaryPath = `${this.filePath}.tmp`;
		await fs.promises.writeFile(
			temporaryPath,
			JSON.stringify(this.state, null, 2),
		);
		await fs.promises.rename(temporaryPath, this.filePath);
	}
}
