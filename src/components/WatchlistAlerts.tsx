import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Repo } from "../lib/types";
import { fetchAlertStatus } from "../lib/api";
import { BellIcon } from "./icons";
import { useToast } from "./Toast";
import {
	useWatchlistAlerts,
	useWatchlistSettings,
} from "../hooks/useWatchlistAlerts";

export default function WatchlistAlerts({
	items,
	window,
}: {
	items: Repo[];
	window: string;
}) {
	const { settings, update } = useWatchlistSettings();
	const { rising } = useWatchlistAlerts(items, settings);
	const { data: alertStatus } = useQuery({
		queryKey: ["alert-status"],
		queryFn: fetchAlertStatus,
		staleTime: 60_000,
	});
	const toast = useToast();
	const [expanded, setExpanded] = useState(false);

	const enableAlerts = () => {
		if (!alertStatus?.telegramConfigured) {
			toast.show("Telegram alerts are not configured on the server yet.");
			return;
		}
		update({ telegramEnabled: true });
		toast.show("Telegram pulse preview enabled. Turn it on for repos below.");
	};

	return (
		<div className="border-y border-border/70 py-2.5">
			<div className="flex min-w-0 items-center gap-2">
				<BellIcon size={17} className="mt-0.5 shrink-0 text-accent" />
				<div className="min-w-0">
					<div className="text-xs font-semibold">Telegram watchlist alerts</div>
					<p className="mt-0.5 truncate text-[11px] text-muted">
						{rising.length > 0
							? `${rising.length} repo${rising.length === 1 ? " is" : "s are"} above your preview threshold.`
							: "Enable Telegram per repo when watched projects accelerate."}
					</p>
				</div>
				<div className="ml-auto flex shrink-0 items-center gap-1.5">
					{settings.telegramEnabled ? (
						<button
							type="button"
							onClick={() => update({ telegramEnabled: false })}
							className="rounded-lg border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent"
						>
							Telegram on
						</button>
					) : (
						<button
							type="button"
							disabled={alertStatus === undefined}
							onClick={enableAlerts}
							className="btn-primary px-2.5 py-1.5 text-[11px] disabled:opacity-50"
						>
							{alertStatus === undefined ? "Checking…" : "Enable Telegram"}
						</button>
					)}
					<button
						type="button"
						aria-expanded={expanded}
						onClick={() => setExpanded((open) => !open)}
						className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted hover:border-primary/50 hover:text-text"
					>
						{expanded ? "Done" : "Tune"}
					</button>
				</div>
			</div>
			{expanded && (
				<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-7 text-[11px] text-muted">
					<label className="flex items-center gap-2">
						<span>Preview at</span>
						<input
							type="number"
							min={1}
							value={settings.alertThreshold}
							onChange={(event) =>
								update({
									alertThreshold: Math.max(1, Number(event.target.value) || 1),
								})
							}
							className="input !w-16 !px-2 !py-1.5 text-center text-xs"
							aria-label="Watchlist alert threshold"
						/>
						<span>stars / {window}</span>
					</label>
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							checked={settings.digestEnabled}
							onChange={(event) =>
								update({ digestEnabled: event.target.checked })
							}
							className="accent-primary"
						/>
						Show pulse digest
					</label>
					<span
						className={
							alertStatus?.telegramConfigured
								? "text-accent"
								: "text-yellow-300"
						}
					>
						{alertStatus?.telegramConfigured
							? "Telegram bridge ready"
							: "Telegram bridge unavailable"}
					</span>
				</div>
			)}
			{settings.digestEnabled && rising.length > 0 && (
				<p className="mt-2 truncate pl-7 text-[11px] text-muted">
					Pulse summary:{" "}
					{rising
						.slice(0, 3)
						.map(
							(repo) => `${repo.fullName} +${repo.starDelta?.toLocaleString()}`,
						)
						.join(" · ")}
					{rising.length > 3 ? ` · +${rising.length - 3} more` : ""}
				</p>
			)}
		</div>
	);
}
