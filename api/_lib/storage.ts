import type { NormalizedRepo } from "./github";
import {
	addFavourite,
	ensureSchema,
	listFavouriteIds,
	queryFavourites,
	queryHistory,
	queryRepoByName,
	queryRisers,
	queryStats,
	removeFavourite,
	upsertAndSnapshot,
	type HistoryPoint,
	type RepoStats,
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
	queryHistory(repoId: number, days: number): Promise<HistoryPoint[]>;
	queryRepoByName(fullName: string): Promise<NormalizedRepo | null>;
	listFavouriteIds(): Promise<number[]>;
	addFavourite(repo: NormalizedRepo): Promise<void>;
	removeFavourite(repoId: number): Promise<void>;
	queryFavourites(
		windowDays: number,
	): Promise<
		(NormalizedRepo & { starDelta: number | null; history: number[] })[]
	>;
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

	queryFavourites(windowDays: number) {
		return queryFavourites(this.connStr, windowDays);
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
