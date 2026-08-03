import { useNavigate } from "react-router-dom";
import RepoRow from "./RepoRow";
import RiserRow from "./RiserRow";
import WatchlistMetaEditor from "./WatchlistMetaEditor";
import { useRovingKeys } from "../hooks/useRovingKeys";
import type { WatchlistRepo } from "../lib/types";
import { safeExternalUrl } from "../lib/format";

interface Props {
	items: WatchlistRepo[];
	density: "rich" | "compact";
	window: "1d" | "7d" | "30d";
	windowDays: number;
	selectedIds: Set<number>;
	onToggleSelection: (id: number) => void;
}

export default function WatchlistList({
	items,
	density,
	window: period,
	windowDays,
	selectedIds,
	onToggleSelection,
}: Props) {
	const navigate = useNavigate();
	const { sel } = useRovingKeys(items.length, {
		onOpen: (index) => navigate(`/repo/${items[index].fullName}`),
		onExternal: (index) =>
			window.open(
				safeExternalUrl(items[index].htmlUrl, items[index].fullName),
				"_blank",
				"noreferrer",
			),
	});

	const selectionControl = (repo: WatchlistRepo) => (
		<label
			className="flex shrink-0 items-center justify-center px-1 text-muted"
			onClick={(event) => event.stopPropagation()}
		>
			<input
				type="checkbox"
				checked={selectedIds.has(repo.id)}
				onChange={() => onToggleSelection(repo.id)}
				onClick={(event) => event.stopPropagation()}
				aria-label={`Select ${repo.fullName}`}
				className="accent-primary"
			/>
		</label>
	);

	return (
		<>
			<div className="flex flex-col gap-2.5">
				{items.map((repo, index) => (
					<div key={repo.id}>
						{density === "compact" ? (
							<RepoRow
								repo={repo}
								rank={index + 1}
								selected={sel === index}
								compact
								stagger={index}
								leading={selectionControl(repo)}
								right={
									repo.starDelta != null ? (
										<div className="shrink-0 text-right">
											<div className="font-mono text-sm font-bold tabular-nums text-success">
												+{repo.starDelta.toLocaleString()}
											</div>
											<div className="text-[9px] uppercase tracking-wider text-muted">
												· {period}
											</div>
										</div>
									) : undefined
								}
							/>
						) : (
							<RiserRow
								repo={repo}
								rank={index + 1}
								windowDays={windowDays}
								window={period}
								selected={sel === index}
								stagger={index}
								leading={selectionControl(repo)}
							/>
						)}
						<WatchlistMetaEditor repo={repo} />
					</div>
				))}
			</div>
			<p className="hidden text-right text-[11px] text-muted md:block">
				<kbd className="rounded border border-border px-1">j</kbd>{" "}
				<kbd className="rounded border border-border px-1">k</kbd> navigate ·{" "}
				<kbd className="rounded border border-border px-1">↵</kbd> details ·{" "}
				<kbd className="rounded border border-border px-1">o</kbd> github
			</p>
		</>
	);
}
