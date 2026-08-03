import type { NormalizedRepo } from "./github";
import {
	addFavourite,
	ensureSchema,
	hasAlertEvent,
	listFavouriteIds,
	queryAlertCandidates,
	queryFavourites,
	queryHistory,
	queryRepoByName,
	queryPulse,
	queryRisers,
	queryStats,
	recordAlertEvent,
	removeFavourite,
	updateFavourites,
	upsertAndSnapshot,
	type AlertCandidate,
	type AlertEvent,
	type FavouritePatch,
	type HistoryPoint,
	type PulseResult,
	type RepoStats,
	type WatchlistRepo,
} from "./db";
import { LiteStore } from "./lite-store";

export interface RepoStorage {
	readonly mode: "postgres" | "lite";
	ensureSchema(): Promise<void>;
	upsertAndSnapshot(repos: NormalizedRepo[]): Promise<void>;
	queryRisers(
		windowDays: number,
		limit: number,
		offset?: number,
	): Promise<{
		items: (NormalizedRepo & { starDelta: number; history: number[] })[];
		total: number;
	}>;
	queryStats(): Promise<RepoStats>;
	queryPulse(since: string, limit?: number): Promise<PulseResult>;
	queryHistory(repoId: number, days: number): Promise<HistoryPoint[]>;
	queryRepoByName(fullName: string): Promise<NormalizedRepo | null>;
	listFavouriteIds(): Promise<number[]>;
	addFavourite(repo: NormalizedRepo): Promise<void>;
	removeFavourite(repoId: number): Promise<void>;
	updateFavourites(repoIds: number[], patch: FavouritePatch): Promise<void>;
	queryFavourites(windowDays: number): Promise<WatchlistRepo[]>;
	queryAlertCandidates(): Promise<AlertCandidate[]>;
	hasAlertEvent(signature: string): Promise<boolean>;
	recordAlertEvent(
		event: Pick<AlertEvent, "signature" | "repoId" | "snapshotAt">,
	): Promise<void>;
}

class PostgresStore implements RepoStorage {
	readonly mode = "postgres" as const;

	constructor(private readonly connStr: string) {}

	ensureSchema(): Promise<void> {
		return ensureSchema(this.connStr);
	}

	upsertAndSnapshot(repos: NormalizedRepo[]): Promise<void> {
		return upsertAndSnapshot(repos, this.connStr);
	}

	queryRisers(windowDays: number, limit: number, offset = 0) {
		return queryRisers(this.connStr, windowDays, limit, offset);
	}

	queryStats() {
		return queryStats(this.connStr);
	}

	queryPulse(since: string, limit?: number) {
		return queryPulse(this.connStr, since, limit);
	}

	queryHistory(repoId: number, days: number) {
		return queryHistory(this.connStr, repoId, days);
	}

	queryRepoByName(fullName: string) {
		return queryRepoByName(this.connStr, fullName);
	}

	listFavouriteIds() {
		return listFavouriteIds(this.connStr);
	}

	addFavourite(repo: NormalizedRepo) {
		return addFavourite(this.connStr, repo);
	}

	removeFavourite(repoId: number) {
		return removeFavourite(this.connStr, repoId);
	}

	updateFavourites(repoIds: number[], patch: FavouritePatch) {
		return updateFavourites(this.connStr, repoIds, patch);
	}

	queryFavourites(windowDays: number) {
		return queryFavourites(this.connStr, windowDays);
	}

	queryAlertCandidates() {
		return queryAlertCandidates(this.connStr);
	}

	hasAlertEvent(signature: string) {
		return hasAlertEvent(this.connStr, signature);
	}

	recordAlertEvent(
		event: Pick<AlertEvent, "signature" | "repoId" | "snapshotAt">,
	) {
		return recordAlertEvent(this.connStr, event);
	}
}

export interface StorageConfig {
	mode?: string;
	postgresUrl?: string;
	dataDir?: string;
}

export function createStorage(config: StorageConfig = {}): RepoStorage {
	const mode = config.mode ?? process.env.REPORADAR_MODE;
	const postgresUrl = config.postgresUrl ?? process.env.POSTGRES_URL;

	if (mode === "postgres" && !postgresUrl) {
		throw new Error("REPORADAR_MODE=postgres requires POSTGRES_URL");
	}
	if (mode !== "lite" && postgresUrl) {
		return new PostgresStore(postgresUrl);
	}

	return new LiteStore(config.dataDir ?? process.env.REPORADAR_DATA_DIR);
}
