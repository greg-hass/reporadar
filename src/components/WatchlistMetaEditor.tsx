import { useEffect, useState } from "react";
import type { WatchlistRepo, WatchlistStatus } from "../lib/types";
import { useUpdateWatchlist } from "../hooks/useFavourites";
import { CheckIcon, SettingsIcon, XIcon } from "./icons";

const STATUS_LABELS: Record<WatchlistStatus, string> = {
	watching: "Watching",
	building: "Building",
	paused: "Paused",
	archived: "Archived",
};

const STATUS_OPTIONS: WatchlistStatus[] = [
	"watching",
	"building",
	"paused",
	"archived",
];

function parseTags(value: string): string[] {
	return [
		...new Set(
			value
				.split(",")
				.map((tag) => tag.trim().toLowerCase())
				.filter(Boolean),
		),
	].slice(0, 12);
}

function statusClass(status: WatchlistStatus): string {
	switch (status) {
		case "building":
			return "border-accent/30 bg-accent/10 text-accent";
		case "paused":
			return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
		case "archived":
			return "border-border bg-bg text-muted";
		default:
			return "border-primary/30 bg-primary/10 text-primary";
	}
}

export default function WatchlistMetaEditor({ repo }: { repo: WatchlistRepo }) {
	const update = useUpdateWatchlist();
	const [open, setOpen] = useState(false);
	const [status, setStatus] = useState<WatchlistStatus>(repo.watchlist.status);
	const [tags, setTags] = useState(repo.watchlist.tags.join(", "));
	const [note, setNote] = useState(repo.watchlist.note);
	const [telegramEnabled, setTelegramEnabled] = useState(
		repo.watchlist.telegramEnabled,
	);
	const [alertThreshold, setAlertThreshold] = useState(
		repo.watchlist.alertThreshold,
	);

	useEffect(() => {
		if (open) return;
		setStatus(repo.watchlist.status);
		setTags(repo.watchlist.tags.join(", "));
		setNote(repo.watchlist.note);
		setTelegramEnabled(repo.watchlist.telegramEnabled);
		setAlertThreshold(repo.watchlist.alertThreshold);
	}, [open, repo.watchlist]);

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await update.mutateAsync({
				ids: [repo.id],
				patch: {
					status,
					tags: parseTags(tags),
					note: note.trim(),
					telegramEnabled,
					alertThreshold: Math.max(
						1,
						Math.min(Math.floor(alertThreshold) || 1, 1_000_000),
					),
				},
			});
			setOpen(false);
		} catch {
			// The mutation owns the user-facing error toast.
		}
	};

	return (
		<div className="-mt-2 rounded-b-lg border-x border-b border-border bg-surface/60 px-3 py-2">
			<div className="flex flex-wrap items-center gap-1.5 text-[11px]">
				<span
					className={`rounded-full border px-2 py-0.5 font-semibold ${statusClass(repo.watchlist.status)}`}
				>
					{STATUS_LABELS[repo.watchlist.status]}
				</span>
				{repo.watchlist.tags.map((tag) => (
					<span key={tag} className="rounded-full bg-bg px-2 py-0.5 text-muted">
						#{tag}
					</span>
				))}
				{repo.watchlist.note && (
					<span
						className="min-w-0 truncate text-muted"
						title={repo.watchlist.note}
					>
						· {repo.watchlist.note}
					</span>
				)}
				{repo.watchlist.telegramEnabled && (
					<span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
						Telegram ≥ {repo.watchlist.alertThreshold.toLocaleString()}
					</span>
				)}
				<button
					type="button"
					onClick={() => setOpen((value) => !value)}
					className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted hover:bg-bg hover:text-text"
					aria-expanded={open}
					aria-label={`Edit watchlist details for ${repo.fullName}`}
				>
					{open ? <XIcon size={12} /> : <SettingsIcon size={12} />}
					{open ? "Close" : "Edit"}
				</button>
			</div>

			{open && (
				<form
					onSubmit={save}
					className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-[130px_1fr]"
				>
					<label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
						Status
						<select
							value={status}
							onChange={(event) =>
								setStatus(event.target.value as WatchlistStatus)
							}
							className="rounded-lg border border-border bg-bg px-2.5 py-2 text-xs normal-case tracking-normal text-text outline-none focus:border-primary/60"
						>
							{STATUS_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{STATUS_LABELS[option]}
								</option>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
						Tags
						<input
							value={tags}
							onChange={(event) => setTags(event.target.value)}
							placeholder="frontend, infra, try-later"
							className="rounded-lg border border-border bg-bg px-2.5 py-2 text-xs normal-case tracking-normal text-text outline-none placeholder:text-muted/60 focus:border-primary/60"
						/>
					</label>
					<label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted sm:col-span-2">
						Note
						<textarea
							value={note}
							onChange={(event) => setNote(event.target.value)}
							maxLength={500}
							rows={2}
							placeholder="Why is this on the watchlist?"
							className="resize-y rounded-lg border border-border bg-bg px-2.5 py-2 text-xs normal-case tracking-normal text-text outline-none placeholder:text-muted/60 focus:border-primary/60"
						/>
					</label>
					<div className="flex flex-wrap items-center gap-3 text-xs text-muted sm:col-span-2">
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={telegramEnabled}
								onChange={(event) => setTelegramEnabled(event.target.checked)}
								className="accent-primary"
							/>
							Telegram alerts
						</label>
						<label className="flex items-center gap-2">
							<span>Alert at</span>
							<input
								type="number"
								min={1}
								max={1_000_000}
								value={alertThreshold}
								onChange={(event) =>
									setAlertThreshold(
										Math.max(1, Number(event.target.value) || 1),
									)
								}
								disabled={!telegramEnabled}
								className="input !w-20 !px-2 !py-1.5 text-center text-xs disabled:opacity-50"
								aria-label={`Telegram alert threshold for ${repo.fullName}`}
							/>
							<span>stars / snapshot</span>
						</label>
					</div>
					<div className="flex justify-end gap-2 sm:col-span-2">
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="rounded-lg px-3 py-2 text-xs text-muted hover:text-text"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={update.isPending}
							className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50"
						>
							<CheckIcon size={13} />{" "}
							{update.isPending ? "Saving…" : "Save details"}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
