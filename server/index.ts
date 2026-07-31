import express, { type Express } from "express";
import path from "node:path";
import cron from "node-cron";
import {
	githubSearch,
	githubRepo,
	githubRepoById,
	githubReadme,
	type NormalizedRepo,
	type SearchQuery,
} from "../api/_lib/github";
import {
	createStorage,
	type RepoStorage,
	type StorageConfig,
} from "../api/_lib/storage";
import { sanitizeFavouritePayload } from "../api/_lib/sanitize";

export interface AppConfig extends StorageConfig {
	port?: number;
	githubToken?: string;
	cronSchedule?: string;
}

const ONE = (value: unknown): string | undefined =>
	Array.isArray(value) ? value[0] : (value as string | undefined);

function readConfig(): AppConfig {
	return {
		port: Number(process.env.PORT ?? 3000),
		githubToken: process.env.GITHUB_SERVER_TOKEN || undefined,
		mode: process.env.REPORADAR_MODE,
		postgresUrl: process.env.POSTGRES_URL,
		dataDir: process.env.REPORADAR_DATA_DIR,
		cronSchedule: process.env.CRON_SCHEDULE ?? "0 * * * *",
	};
}

function windowDays(value: unknown, fallback = 7): number {
	switch (ONE(value)) {
		case "1d":
			return 1;
		case "30d":
			return 30;
		case "7d":
			return 7;
		default:
			return fallback;
	}
}

export function createApp(
	config: AppConfig = readConfig(),
	storage = createStorage(config),
): Express {
	const app = express();
	app.use(express.json());

	app.get("/api/search", async (req, res) => {
		const q = ONE(req.query.q);
		if (!q) {
			res.status(400).json({ error: "q is required" });
			return;
		}
		const topicsRaw = ONE(req.query.topics);
		const query: SearchQuery = {
			q,
			language: ONE(req.query.language) || undefined,
			topics: topicsRaw ? topicsRaw.split(",").filter(Boolean) : undefined,
			minStars: req.query.minStars
				? Number(ONE(req.query.minStars))
				: undefined,
			createdSinceDays: req.query.createdSinceDays
				? Number(ONE(req.query.createdSinceDays))
				: undefined,
			sort: ONE(req.query.sort),
			page: req.query.page ? Number(ONE(req.query.page)) : undefined,
		};
		try {
			res.json(await githubSearch(query, config.githubToken ?? ""));
		} catch (error) {
			const message = error instanceof Error ? error.message : "search failed";
			res
				.status(message.startsWith("GitHub 403") ? 429 : 500)
				.json({ error: message });
		}
	});

	app.get("/api/risers", async (req, res) => {
		try {
			const page = Math.max(1, Number(ONE(req.query.page)) || 1);
			const result = await storage.queryRisers(
				windowDays(req.query.window),
				50,
				(page - 1) * 50,
			);
			res.json(result);
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "risers failed",
				});
		}
	});

	app.get("/api/stats", async (_req, res) => {
		try {
			res.json(await storage.queryStats());
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "stats failed",
				});
		}
	});

	app.get("/api/repos/:id/history", async (req, res) => {
		const id = Number(req.params.id);
		if (!Number.isFinite(id)) {
			res.status(400).json({ error: "repo id must be a number" });
			return;
		}
		try {
			const days = req.query.days ? Number(ONE(req.query.days)) : 30;
			res.json({ points: await storage.queryHistory(id, days) });
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "history failed",
				});
		}
	});

	app.get("/api/repo/:owner/:name", async (req, res) => {
		const fullName = `${req.params.owner}/${req.params.name}`;
		try {
			const cached = await storage.queryRepoByName(fullName);
			if (cached) {
				res.json(cached);
				return;
			}
			res.json(
				await githubRepo(
					req.params.owner,
					req.params.name,
					config.githubToken ?? "",
				),
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "repo lookup failed";
			res
				.status(message.startsWith("GitHub 404") ? 404 : 500)
				.json({ error: message });
		}
	});

	app.get("/api/repo/:owner/:name/readme", async (req, res) => {
		try {
			res.json({
				html: await githubReadme(
					req.params.owner,
					req.params.name,
					config.githubToken ?? "",
				),
			});
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "readme failed",
				});
		}
	});

	app.get("/api/favourites", async (req, res) => {
		try {
			const items = await storage.queryFavourites(windowDays(req.query.window));
			res.json({ items, total: items.length });
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "favourites failed",
				});
		}
	});

	app.get("/api/favourites/ids", async (_req, res) => {
		try {
			res.json({ ids: await storage.listFavouriteIds() });
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "favourites failed",
				});
		}
	});

	app.put("/api/favourites/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (!Number.isFinite(id)) {
			res.status(400).json({ error: "repo id must be a number" });
			return;
		}
		const repo = sanitizeFavouritePayload(req.body, id);
		if (!repo) {
			res.status(400).json({ error: "repo payload required" });
			return;
		}
		try {
			await storage.addFavourite(repo);
			res.json({ ok: true });
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "favourite failed",
				});
		}
	});

	app.delete("/api/favourites/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (!Number.isFinite(id)) {
			res.status(400).json({ error: "repo id must be a number" });
			return;
		}
		try {
			await storage.removeFavourite(id);
			res.json({ ok: true });
		} catch (error) {
			res
				.status(500)
				.json({
					error: error instanceof Error ? error.message : "unfavourite failed",
				});
		}
	});

	const distDir = path.resolve(__dirname, "..", "..", "dist");
	app.use(express.static(distDir));
	app.get("*", (_req, res) => {
		res.sendFile(path.join(distDir, "index.html"));
	});

	return app;
}

export async function runTrackingJob(
	config: AppConfig,
	storage: RepoStorage,
): Promise<void> {
	if (
		storage.mode === "postgres" &&
		(!config.githubToken || !config.postgresUrl)
	) {
		console.error(
			"[cron] skipping: GITHUB_SERVER_TOKEN and POSTGRES_URL must be set",
		);
		return;
	}

	const monthAgo = new Date(Date.now() - 30 * 86_400_000)
		.toISOString()
		.slice(0, 10);
	const baseQueries: { q: string; fresh?: boolean }[] = [
		{ q: "stars:>50", fresh: true },
		{ q: "stars:>100 topic:ai", fresh: true },
		{ q: "stars:>100 topic:cli", fresh: true },
		{ q: `stars:>1000 pushed:>${monthAgo}` },
	];
	const rotatingQueries: { q: string; fresh?: boolean }[] = [
		{ q: `stars:>500 language:typescript pushed:>${monthAgo}` },
		{ q: `stars:>500 language:python pushed:>${monthAgo}` },
		{ q: `stars:>500 language:rust pushed:>${monthAgo}` },
		{ q: `stars:>500 language:go pushed:>${monthAgo}` },
		{ q: "stars:>200 topic:llm", fresh: true },
		{ q: "stars:>200 topic:agents", fresh: true },
		{ q: "stars:>200 topic:mcp", fresh: true },
		{ q: `stars:>200 topic:devtools pushed:>${monthAgo}` },
		{ q: `stars:>200 topic:self-hosted pushed:>${monthAgo}` },
		{ q: `stars:>200 topic:react pushed:>${monthAgo}` },
		{ q: `stars:>200 topic:machine-learning pushed:>${monthAgo}` },
		{ q: `stars:>200 topic:security pushed:>${monthAgo}` },
	];
	const hour = new Date().getHours();
	const queries =
		storage.mode === "lite"
			? baseQueries.slice(0, 1)
			: [
					...baseQueries,
					rotatingQueries[hour % rotatingQueries.length],
					rotatingQueries[(hour + 4) % rotatingQueries.length],
					rotatingQueries[(hour + 8) % rotatingQueries.length],
				];
	const seen = new Set<number>();
	const candidates: NormalizedRepo[] = [];

	for (const { q, fresh } of queries) {
		try {
			const result = await githubSearch(
				{ q, createdSinceDays: fresh ? 7 : undefined, sort: "stars", page: 1 },
				config.githubToken ?? "",
			);
			for (const repo of result.items) {
				if (!seen.has(repo.id)) {
					seen.add(repo.id);
					candidates.push(repo);
				}
				if (candidates.length >= (storage.mode === "lite" ? 30 : 200)) break;
			}
			if (candidates.length >= (storage.mode === "lite" ? 30 : 200)) break;
		} catch (error) {
			console.error(
				`[cron] query "${q}" failed:`,
				error instanceof Error ? error.message : error,
			);
		}
	}

	if (candidates.length) await storage.upsertAndSnapshot(candidates);

	try {
		const favouriteIds = await storage.listFavouriteIds();
		const favouriteRepos: NormalizedRepo[] = [];
		for (const id of favouriteIds) {
			try {
				favouriteRepos.push(await githubRepoById(id, config.githubToken ?? ""));
			} catch (error) {
				console.error(
					`[cron] favourite ${id} refresh failed:`,
					error instanceof Error ? error.message : error,
				);
			}
		}
		if (favouriteRepos.length) await storage.upsertAndSnapshot(favouriteRepos);
	} catch (error) {
		console.error(
			"[cron] favourites refresh failed:",
			error instanceof Error ? error.message : error,
		);
	}
}

export function startServer(config: AppConfig = readConfig()) {
	const storage = createStorage(config);
	const app = createApp(config, storage);
	const server = app.listen(config.port ?? 3000, () => {
		console.log(`RepoRadar listening on :${config.port ?? 3000}`);
		void (async () => {
			if (storage.mode === "postgres") {
				try {
					await storage.ensureSchema();
					console.log("[db] schema ready");
				} catch (error) {
					console.error(
						"[db] schema init failed:",
						error instanceof Error ? error.message : error,
					);
				}
			}
			const schedule = config.cronSchedule ?? "0 * * * *";
			if (cron.validate(schedule)) {
				cron.schedule(schedule, () => {
					runTrackingJob(config, storage).catch((error) => {
						console.error(
							"[cron] job failed:",
							error instanceof Error ? error.message : error,
						);
					});
				});
				console.log(`[cron] scheduled: ${schedule}`);
			} else {
				console.warn(`[cron] invalid CRON_SCHEDULE "${schedule}", skipping`);
			}
			try {
				await runTrackingJob(config, storage);
			} catch (error) {
				console.error(
					"[cron] seed run failed:",
					error instanceof Error ? error.message : error,
				);
			}
		})();
	});
	return server;
}

if (require.main === module) startServer();
