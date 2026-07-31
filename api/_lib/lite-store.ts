import fs from "node:fs";
import path from "node:path";
import type { NormalizedRepo } from "./github";
import type { HistoryPoint, RepoStats } from "./db";
import type { RepoStorage } from "./storage";

type Snapshot = {
	repoId: number;
	capturedAt: string;
	stars: number;
};

type LiteState = {
	repos: NormalizedRepo[];
	snapshots: Snapshot[];
	favourites: NormalizedRepo[];
};

const EMPTY_STATE: LiteState = { repos: [], snapshots: [], favourites: [] };
const MAX_SNAPSHOTS = 50_000;

function cloneState(state: LiteState): LiteState {
	return {
		repos: [...state.repos],
		snapshots: [...state.snapshots],
		favourites: [...state.favourites],
	};
}

export class LiteStore implements RepoStorage {
	readonly mode = "lite" as const;
	private readonly filePath: string;
	private state: LiteState;

	constructor(dataDir = path.resolve(process.cwd(), "data")) {
		this.filePath = path.join(dataDir, "reporadar.json");
		this.state = this.load();
	}

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

	async queryRisers(windowDays: number, limit: number, offset = 0) {
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

		return { items: rows.slice(offset, offset + limit), total: rows.length };
	}

	async queryStats(): Promise<RepoStats> {
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
		const lastSnapshotAt =
			this.state.snapshots
				.map((snapshot) => snapshot.capturedAt)
				.sort((a, b) => a.localeCompare(b))
				.at(-1) ?? null;

		return {
			reposTracked: this.state.repos.length,
			snapshotsToday: todays.length,
			starsGainedToday,
			lastSnapshotAt,
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
				favourites: [...this.state.favourites, repo],
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

	async queryFavourites(windowDays: number) {
		const latest = this.latestSnapshots();
		const cutoff = Date.now() - windowDays * 86_400_000;
		return this.state.favourites.map((favourite) => {
			const current = latest.get(favourite.id);
			const past = this.state.snapshots
				.filter(
					(snapshot) =>
						snapshot.repoId === favourite.id &&
						Date.parse(snapshot.capturedAt) >= cutoff,
				)
				.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))[0];
			return {
				...(this.state.repos.find((repo) => repo.id === favourite.id) ??
					favourite),
				starDelta: current
					? current.stars - (past?.stars ?? current.stars)
					: null,
				history: this.historyFor(favourite.id, 7),
			};
		});
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
			return {
				repos: Array.isArray(parsed.repos) ? parsed.repos : [],
				snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
				favourites: Array.isArray(parsed.favourites) ? parsed.favourites : [],
			};
		} catch {
			return cloneState(EMPTY_STATE);
		}
	}

	private async persist(): Promise<void> {
		await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
		const temporaryPath = `${this.filePath}.tmp`;
		await fs.promises.writeFile(
			temporaryPath,
			JSON.stringify(this.state, null, 2),
		);
		await fs.promises.rename(temporaryPath, this.filePath);
	}
}
