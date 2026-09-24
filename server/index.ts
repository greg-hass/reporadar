import express, { type Express } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import compression from "compression";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
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
import type { AlertCandidate } from "../api/_lib/db";
import {
	sanitizeFavouritePatch,
} from "../api/_lib/sanitize";

export interface AppConfig extends StorageConfig {
	port?: number;
	authUsername?: string;
	authPassword?: string;
	githubToken?: string;
	cronSchedule?: string;
	telegramBridgeCli?: string;
	telegramQuietStartHour?: number;
	telegramQuietEndHour?: number;
	telegramTimeoutMs?: number;
}

const ONE = (value: unknown): string | undefined =>
	Array.isArray(value) ? value[0] : (value as string | undefined);
const DEFAULT_TELEGRAM_BRIDGE_CLI = path.resolve(
	os.homedir(),
	".pi",
	"agent",
	"telegram-bridge",
	"dist",
	"outbound",
	"cli.js",
);

export function resolveDistDir(serverDir = __dirname): string {
	const candidates = [
		path.resolve(serverDir, "..", "dist"),
		path.resolve(serverDir, "..", "..", "dist"),
	];
	return (
		candidates.find((candidate) => existsSync(path.join(candidate, "index.html"))) ??
		candidates[0]
	);
}

function optionalHour(value: string | undefined): number | undefined {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= 0 && parsed < 24
		? parsed
		: undefined;
}

function readConfig(): AppConfig {
	return {
		port: Number(process.env.PORT ?? 3000),
		authUsername: process.env.REPORADAR_AUTH_USER,
		authPassword: process.env.REPORADAR_AUTH_PASSWORD,
		githubToken: process.env.GITHUB_SERVER_TOKEN || undefined,
		mode: process.env.REPORADAR_MODE,
		postgresUrl: process.env.POSTGRES_URL,
		dataDir: process.env.REPORADAR_DATA_DIR,
		cronSchedule: process.env.CRON_SCHEDULE ?? "0 * * * *",
		telegramBridgeCli:
			process.env.REPORADAR_TELEGRAM_BRIDGE_CLI ?? DEFAULT_TELEGRAM_BRIDGE_CLI,
		telegramQuietStartHour: optionalHour(
			process.env.REPORADAR_TELEGRAM_QUIET_START,
		),
		telegramQuietEndHour: optionalHour(
			process.env.REPORADAR_TELEGRAM_QUIET_END,
		),
		telegramTimeoutMs: Math.max(
			1_000,
			Number(process.env.REPORADAR_TELEGRAM_TIMEOUT_MS) || 30_000,
		),
	};
}

function apiAuthentication(config: AppConfig): express.RequestHandler {
	const username = config.authUsername;
	const password = config.authPassword;
	if (
		!username ||
		username.length > 128 ||
		username.includes(":") ||
		!password ||
		password.length < 16 ||
		password.length > 512
	) {
		throw new Error(
			"REPORADAR_AUTH_USER (max 128 chars) and REPORADAR_AUTH_PASSWORD (16–512 chars) are required",
		);
	}
	const expected = createHash("sha256")
		.update(`${username}:${password}`)
		.digest();

	return (req, res, next) => {
		res.set("Cache-Control", "no-store");
		const authorization = req.get("authorization") ?? "";
		const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
		let supplied = Buffer.alloc(0);
		if (match && match[1].length <= 1368) {
			const decoded = Buffer.from(match[1], "base64");
			if (decoded.toString("base64") === match[1]) supplied = decoded;
		}
		const actual = createHash("sha256").update(supplied).digest();
		if (timingSafeEqual(actual, expected)) {
			if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
				const origin = req.get("origin");
				if (origin) {
					try {
						if (new URL(origin).host !== (req.get("host") ?? "").toLowerCase()) {
							res.status(403).json({ error: "cross-origin request rejected" });
							return;
						}
					} catch {
						res.status(403).json({ error: "cross-origin request rejected" });
						return;
					}
				}
			}
			next();
			return;
		}
		res.set("WWW-Authenticate", 'Basic realm="RepoRadar", charset="UTF-8"');
		res.status(401).json({ error: "authentication required" });
	};
}

function searchRateLimiter(): express.RequestHandler {
	let windowStartedAt = Date.now();
	let requests = 0;
	return (_req, res, next) => {
		const now = Date.now();
		if (now - windowStartedAt >= 60_000) {
			windowStartedAt = now;
			requests = 0;
		}
		requests += 1;
		if (requests > 60) {
			res.set("Retry-After", "60");
			res.status(429).json({ error: "search request limit reached; retry shortly" });
			return;
		}
		next();
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

function pulseSince(value: unknown): string {
	const raw = ONE(value);
	const timestamp = raw ? Date.parse(raw) : Number.NaN;
	return Number.isFinite(timestamp)
		? new Date(timestamp).toISOString()
		: new Date(Date.now() - 7 * 86_400_000).toISOString();
}

function pulseLimit(value: unknown): number {
	const parsed = Number(ONE(value));
	return Number.isFinite(parsed)
		? Math.min(24, Math.max(1, Math.trunc(parsed)))
		: 12;
}

function favouriteIds(value: unknown): number[] | null {
	if (!Array.isArray(value)) return null;
	const ids = value
		.filter(
			(id): id is number =>
				typeof id === "number" && Number.isSafeInteger(id) && id > 0,
		)
		.slice(0, 100);
	return ids.length ? [...new Set(ids)] : null;
}

export function createApp(
	config: AppConfig = readConfig(),
	storage = createStorage(config),
): Express {
	const app = express();
	app.use((_req, res, next) => {
		res.set({
			"Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
			"Strict-Transport-Security": "max-age=31536000",
		});
		next();
	});
	app.use(apiAuthentication(config));
	app.use(compression());
	app.set("query parser", "simple");
	app.use("/api/search", searchRateLimiter());
	app.use(express.json({ limit: "32kb" }));

	app.get("/api/search", async (req, res) => {
		const q = ONE(req.query.q)?.trim();
		if (!q || q.length > 256) {
			res.status(400).json({ error: "q is required" });
			return;
		}
		const topicsRaw = ONE(req.query.topics);
		const topics = topicsRaw ? topicsRaw.split(",").filter(Boolean) : undefined;
		const minStarsRaw = ONE(req.query.minStars);
		const createdDaysRaw = ONE(req.query.createdSinceDays);
		const pushedDaysRaw = ONE(req.query.pushedSinceDays);
		const pageRaw = ONE(req.query.page);
		const language = ONE(req.query.language);
		const sort = ONE(req.query.sort);
		const minStars = minStarsRaw === undefined ? undefined : Number(minStarsRaw);
		const createdSinceDays =
			createdDaysRaw === undefined ? undefined : Number(createdDaysRaw);
		const pushedSinceDays =
			pushedDaysRaw === undefined ? undefined : Number(pushedDaysRaw);
		const page = pageRaw === undefined ? undefined : Number(pageRaw);
		if (
			(topics && (topics.length > 10 || topics.some((topic) => topic.length > 50))) ||
			(language !== undefined && language.length > 40) ||
			(sort !== undefined && !["best-match", "stars", "updated"].includes(sort)) ||
			(minStars !== undefined && (!Number.isFinite(minStars) || minStars < 0 || minStars > 1_000_000_000)) ||
			(createdSinceDays !== undefined && (!Number.isFinite(createdSinceDays) || createdSinceDays < 1 || createdSinceDays > 3650)) ||
			(pushedSinceDays !== undefined && (!Number.isFinite(pushedSinceDays) || pushedSinceDays < 1 || pushedSinceDays > 3650)) ||
			(page !== undefined && (!Number.isInteger(page) || page < 1 || page > 34))
		) {
			res.status(400).json({ error: "search filters are outside supported limits" });
			return;
		}
		const effectiveQueryLength = [
			q,
			language ? `language:${language}` : "",
			...(topics ?? []).map((topic) => `topic:${topic}`),
			minStars === undefined ? "" : `stars:>=${minStars}`,
		]
			.filter(Boolean)
			.join(" ").length;
		if (effectiveQueryLength > 256) {
			res.status(400).json({ error: "combined search query must be 256 characters or fewer" });
			return;
		}
		const query: SearchQuery = {
			q,
			language: language || undefined,
			topics,
			minStars,
			createdSinceDays,
			pushedSinceDays,
			sort,
			page,
		};
		try {
			const result = await githubSearch(query, config.githubToken ?? "");
			res.json(result);
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
			res.status(500).json({
				error: error instanceof Error ? error.message : "risers failed",
			});
		}
	});

	app.get("/api/stats", async (_req, res) => {
		try {
			res.json(await storage.queryStats());
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : "stats failed",
			});
		}
	});

	app.get("/api/alerts/status", (_req, res) => {
		res.json({
			telegramConfigured: Boolean(
				config.telegramBridgeCli && existsSync(config.telegramBridgeCli),
			),
			quietHoursConfigured:
				config.telegramQuietStartHour !== undefined &&
				config.telegramQuietEndHour !== undefined &&
				config.telegramQuietStartHour !== config.telegramQuietEndHour,
		});
	});

	app.get("/api/pulse", async (req, res) => {
		try {
			res.json(
				await storage.queryPulse(
					pulseSince(req.query.since),
					pulseLimit(req.query.limit),
				),
			);
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : "pulse failed",
			});
		}
	});

	app.get("/api/repos/:id/history", async (req, res) => {
		const id = Number(req.params.id);
		if (!Number.isSafeInteger(id) || id <= 0) {
			res.status(400).json({ error: "repo id must be a positive integer" });
			return;
		}
		try {
			const rawDays = req.query.days ? Number(ONE(req.query.days)) : 30;
			const days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 30;
			res.json({ points: await storage.queryHistory(id, days) });
		} catch (error) {
			res.status(500).json({
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
			res.status(500).json({
				error: error instanceof Error ? error.message : "readme failed",
			});
		}
	});

	app.get("/api/favourites", async (req, res) => {
		try {
			const items = await storage.queryFavourites(windowDays(req.query.window));
			res.json({ items, total: items.length });
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : "favourites failed",
			});
		}
	});

	app.get("/api/favourites/ids", async (_req, res) => {
		try {
			res.json({ ids: await storage.listFavouriteIds() });
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : "favourites failed",
			});
		}
	});

	app.put("/api/favourites/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (!Number.isSafeInteger(id) || id <= 0) {
			res.status(400).json({ error: "repo id must be a positive integer" });
			return;
		}
		try {
			const requestedName = req.body?.fullName;
			const cached =
				typeof requestedName === "string"
					? await storage.queryRepoByName(requestedName)
					: null;
			const repo =
				cached?.id === id
					? cached
					: await githubRepoById(id, config.githubToken ?? "");
			await storage.addFavourite(repo);
			res.json({ ok: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : "favourite failed";
			const status = message.startsWith("GitHub 404")
				? 404
				: message.startsWith("GitHub 403")
					? 429
					: 500;
			res.status(status).json({ error: message });
		}
	});

	app.patch("/api/favourites", async (req, res) => {
		const body = req.body as { ids?: unknown; patch?: unknown };
		const ids = favouriteIds(body?.ids);
		const patch = sanitizeFavouritePatch(body?.patch);
		if (!ids || !patch) {
			res.status(400).json({ error: "ids and a valid patch are required" });
			return;
		}
		try {
			await storage.updateFavourites(ids, patch);
			res.json({ ok: true, updated: ids.length });
		} catch (error) {
			res.status(500).json({
				error:
					error instanceof Error ? error.message : "watchlist update failed",
			});
		}
	});

	app.patch("/api/favourites/:id", async (req, res) => {
		const id = Number(req.params.id);
		const patch = sanitizeFavouritePatch(req.body);
		if (!Number.isSafeInteger(id) || id <= 0 || !patch) {
			res.status(400).json({ error: "repo id and a valid patch are required" });
			return;
		}
		try {
			await storage.updateFavourites([id], patch);
			res.json({ ok: true, updated: 1 });
		} catch (error) {
			res.status(500).json({
				error:
					error instanceof Error ? error.message : "watchlist update failed",
			});
		}
	});

	app.delete("/api/favourites/:id", async (req, res) => {
		const id = Number(req.params.id);
		if (!Number.isSafeInteger(id) || id <= 0) {
			res.status(400).json({ error: "repo id must be a positive integer" });
			return;
		}
		try {
			await storage.removeFavourite(id);
			res.json({ ok: true });
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : "unfavourite failed",
			});
		}
	});

	const distDir = resolveDistDir();
	app.use(
		express.static(distDir, {
			setHeaders: (res, filePath) => {
				if (filePath.includes(`${path.sep}assets${path.sep}`)) {
					res.set("Cache-Control", "public, max-age=31536000, immutable");
				} else {
					res.set("Cache-Control", "no-cache");
				}
			},
		}),
	);
	app.get("*", (_req, res) => {
		res.sendFile(path.join(distDir, "index.html"));
	});

	return app;
}

export type TelegramNotifier = (
	config: AppConfig,
	text: string,
) => Promise<void>;

export function isTelegramQuietHours(
	config: AppConfig,
	now = new Date(),
): boolean {
	const start = config.telegramQuietStartHour;
	const end = config.telegramQuietEndHour;
	if (start === undefined || end === undefined || start === end) return false;
	const hour = now.getHours();
	return start < end
		? hour >= start && hour < end
		: hour >= start || hour < end;
}

export function formatTelegramAlert(candidate: AlertCandidate): string {
	return [
		`📈 **${candidate.repo.fullName}** gained **+${candidate.starDelta.toLocaleString()} stars** since the last snapshot.`,
		`Current total: ${candidate.repo.starsTotal.toLocaleString()} stars`,
		candidate.repo.htmlUrl,
	].join("\\n");
}

export function sendTelegramAlert(
	config: AppConfig,
	text: string,
): Promise<void> {
	const cliPath = config.telegramBridgeCli;
	if (!cliPath || !existsSync(cliPath)) {
		return Promise.reject(new Error("Telegram bridge CLI is not configured"));
	}

	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [cliPath, "--md"], {
			stdio: ["pipe", "ignore", "ignore"],
		});
		let settled = false;
		const timeout = setTimeout(() => {
			if (settled) return;
			settled = true;
			child.kill("SIGTERM");
			reject(new Error("Telegram bridge timed out"));
		}, config.telegramTimeoutMs ?? 30_000);
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			if (error) reject(error);
			else resolve();
		};
		child.once("error", () =>
			finish(new Error("Telegram bridge could not start")),
		);
		child.once("close", (code) =>
			code === 0
				? finish()
				: finish(new Error("Telegram bridge rejected the alert")),
		);
		child.stdin.end(text);
	});
}

export async function deliverWatchlistAlerts(
	config: AppConfig,
	storage: RepoStorage,
	notify: TelegramNotifier = sendTelegramAlert,
): Promise<number> {
	if (isTelegramQuietHours(config)) return 0;
	let candidates: AlertCandidate[];
	try {
		candidates = await storage.queryAlertCandidates();
	} catch (error) {
		console.error(
			"[alerts] candidate query failed:",
			error instanceof Error ? error.message : error,
		);
		return 0;
	}

	let sent = 0;
	for (const candidate of candidates) {
		const signature = `${candidate.repo.id}:${candidate.snapshotAt}:${candidate.watchlist.alertThreshold}`;
		if (await storage.hasAlertEvent(signature)) continue;
		try {
			await notify(config, formatTelegramAlert(candidate));
			await storage.recordAlertEvent({
				signature,
				repoId: candidate.repo.id,
				snapshotAt: candidate.snapshotAt,
			});
			sent += 1;
		} catch (error) {
			console.error(
				`[alerts] ${candidate.repo.fullName} delivery failed:`,
				error instanceof Error ? error.message : error,
			);
		}
	}
	return sent;
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
		const favouriteIds = await storage.listFavouriteIdsForRefresh();
		const favouriteRepos: NormalizedRepo[] = [];
		const concurrency = 6;
		for (let i = 0; i < favouriteIds.length; i += concurrency) {
			const batch = favouriteIds.slice(i, i + concurrency);
			const refreshed = await Promise.all(
				batch.map(async (id) => {
					try {
						return await githubRepoById(id, config.githubToken ?? "");
					} catch (error) {
						if (error instanceof Error && error.message.startsWith("GitHub 404")) {
							await storage.markFavouriteUnavailable(id);
						}
						console.error(
							`[cron] favourite ${id} refresh failed:`,
							error instanceof Error ? error.message : error,
						);
						return null;
					}
				}),
			);
			favouriteRepos.push(
				...refreshed.filter((repo): repo is NormalizedRepo => repo !== null),
			);
		}
		if (favouriteRepos.length) await storage.upsertAndSnapshot(favouriteRepos);
	} catch (error) {
		console.error(
			"[cron] favourites refresh failed:",
			error instanceof Error ? error.message : error,
		);
	}

	await deliverWatchlistAlerts(config, storage);
}

export function startServer(config: AppConfig = readConfig()) {
	const storage = createStorage(config);
	const app = createApp(config, storage);
	let trackingJobRunning = false;
	const runTrackingJobOnce = async () => {
		if (trackingJobRunning) {
			console.warn("[cron] skipping overlapping tracking run");
			return;
		}
		trackingJobRunning = true;
		try {
			await runTrackingJob(config, storage);
		} finally {
			trackingJobRunning = false;
		}
	};
	return app.listen(config.port ?? 3000, () => {
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
					runTrackingJobOnce().catch((error) => {
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
				await runTrackingJobOnce();
			} catch (error) {
				console.error(
					"[cron] seed run failed:",
					error instanceof Error ? error.message : error,
				);
			}
		})();
	});
}

if (require.main === module) startServer();
