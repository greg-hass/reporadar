import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { putFavourite, updateFavourites } from "../lib/api";
import type {
	Repo,
	WatchlistMeta,
	WatchlistRepo,
	WatchlistStatus,
} from "../lib/types";
import { CheckIcon, CopyIcon } from "./icons";
import { useToast } from "./Toast";

interface WatchlistExport {
	version: 2;
	exportedAt: string;
	repos: WatchlistRepo[];
}

const WATCHLIST_STATUSES: WatchlistStatus[] = [
	"watching",
	"building",
	"paused",
	"archived",
];

function isRepo(value: unknown): value is Repo {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<Repo>;
	return (
		Number.isFinite(candidate.id) &&
		typeof candidate.fullName === "string" &&
		candidate.fullName.includes("/")
	);
}

function importedMeta(value: unknown): WatchlistMeta | undefined {
	if (!value || typeof value !== "object") return undefined;
	const candidate = value as { watchlist?: unknown };
	if (!candidate.watchlist || typeof candidate.watchlist !== "object")
		return undefined;
	const raw = candidate.watchlist as Partial<WatchlistMeta>;
	const tags = Array.isArray(raw.tags)
		? raw.tags.filter((tag): tag is string => typeof tag === "string")
		: [];
	const status = WATCHLIST_STATUSES.includes(raw.status as WatchlistStatus)
		? (raw.status as WatchlistStatus)
		: "watching";
	const threshold =
		typeof raw.alertThreshold === "number" &&
		Number.isFinite(raw.alertThreshold)
			? Math.max(1, Math.min(Math.floor(raw.alertThreshold), 1_000_000))
			: 50;
	return {
		tags,
		note: typeof raw.note === "string" ? raw.note : "",
		status,
		telegramEnabled: raw.telegramEnabled === true,
		alertThreshold: threshold,
	};
}

export default function WatchlistTools({ items }: { items: WatchlistRepo[] }) {
	const inputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const toast = useToast();
	const [importing, setImporting] = useState(false);

	const exportWatchlist = () => {
		const payload: WatchlistExport = {
			version: 2,
			exportedAt: new Date().toISOString(),
			repos: items,
		};
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(payload, null, 2)], {
				type: "application/json",
			}),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `reporadar-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
		toast.show(
			`${items.length} watchlist repo${items.length === 1 ? "" : "s"} exported.`,
		);
	};

	const importWatchlist = async (file: File) => {
		setImporting(true);
		try {
			const parsed: unknown = JSON.parse(await file.text());
			const candidate = Array.isArray(parsed)
				? parsed
				: (parsed as { repos?: unknown } | null)?.repos;
			const entries = Array.isArray(candidate)
				? candidate
						.filter(isRepo)
						.slice(0, 100)
						.map((repo) => ({ repo, meta: importedMeta(repo) }))
				: [];
			if (entries.length === 0)
				throw new Error("No valid RepoRadar repos found in that file.");
			for (const { repo, meta } of entries) {
				await putFavourite(repo);
				if (meta) await updateFavourites([repo.id], meta);
			}
			await queryClient.invalidateQueries({ queryKey: ["favourites"] });
			await queryClient.invalidateQueries({ queryKey: ["favourite-ids"] });
			toast.show(
				`${entries.length} repo${entries.length === 1 ? "" : "s"} added to your watchlist.`,
			);
		} catch (error) {
			toast.show(
				error instanceof Error
					? error.message
					: "Couldn't import that watchlist.",
			);
		} finally {
			setImporting(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	return (
		<div className="flex items-center justify-end gap-2 px-1">
			<button
				type="button"
				onClick={exportWatchlist}
				className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:border-primary/50 hover:text-text"
			>
				<CopyIcon size={13} /> Export
			</button>
			<input
				ref={inputRef}
				type="file"
				accept="application/json,.json"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) void importWatchlist(file);
				}}
			/>
			<button
				type="button"
				disabled={importing}
				onClick={() => inputRef.current?.click()}
				className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs"
			>
				<CheckIcon size={13} /> {importing ? "Importing…" : "Import"}
			</button>
		</div>
	);
}
