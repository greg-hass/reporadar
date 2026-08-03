import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import SegmentedControl from "../components/SegmentedControl";
import DensityToggle from "../components/DensityToggle";
import Skeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import WatchlistAlerts from "../components/WatchlistAlerts";
import WatchlistControls, {
	type StatusFilter,
} from "../components/WatchlistControls";
import WatchlistList from "../components/WatchlistList";
import WatchlistTools from "../components/WatchlistTools";
import { StarIcon } from "../components/icons";
import { useDensity } from "../hooks/useDensity";
import { useFavourites } from "../hooks/useFavourites";

const WINDOW_OPTIONS = [
	{ value: "1d" as const, label: "24h" },
	{ value: "7d" as const, label: "7d" },
	{ value: "30d" as const, label: "30d" },
];
const WINDOW_DAYS = { "1d": 1, "7d": 7, "30d": 30 } as const;
type Window = keyof typeof WINDOW_DAYS;

export default function FavouritesPage() {
	const [win, setWin] = useState<Window>("7d");
	const [density, setDensity] = useDensity();
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [tagFilter, setTagFilter] = useState("all");
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const { data, isLoading, error, refetch } = useFavourites(win);

	const items = data?.items ?? [];
	const visibleItems = items.filter(
		(repo) =>
			(statusFilter === "all" || repo.watchlist.status === statusFilter) &&
			(tagFilter === "all" || repo.watchlist.tags.includes(tagFilter)),
	);

	useEffect(() => {
		const ids = new Set(visibleItems.map((repo) => repo.id));
		setSelectedIds((previous) => {
			const next = new Set([...previous].filter((id) => ids.has(id)));
			return next.size === previous.size ? previous : next;
		});
	}, [visibleItems]);

	const changeWindow = (w: Window) => {
		setWin(w);
	};

	const toggleSelection = (id: number) => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAllVisible = () => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			const allSelected =
				visibleItems.length > 0 &&
				visibleItems.every((repo) => next.has(repo.id));
			for (const repo of visibleItems) {
				if (allSelected) next.delete(repo.id);
				else next.add(repo.id);
			}
			return next;
		});
	};

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
			<PageHeader
				icon={StarIcon}
				eyebrow="Pinned signals"
				title="Watchlist"
				description="Repos you are watching, snapshotted hourly"
				actions={
					<div className="flex w-full min-w-0 gap-2 sm:w-auto">
						<div className="min-w-0 flex-[1.65] sm:flex-none">
							<SegmentedControl
								value={win}
								options={WINDOW_OPTIONS}
								onChange={changeWindow}
								ariaLabel="Time window"
							/>
						</div>
						<div className="min-w-0 flex-1 sm:flex-none">
							<DensityToggle value={density} onChange={setDensity} />
						</div>
					</div>
				}
			/>

			{isLoading ? (
				<Skeleton count={4} />
			) : error ? (
				<ErrorState
					message={(error as Error).message}
					onRetry={() => refetch()}
				/>
			) : items.length === 0 ? (
				<EmptyState
					icon={StarIcon}
					title="No favourites yet"
					hint="Star any repo to pin it here — favourited repos get snapshotted hourly, so their velocity charts fill in automatically."
				/>
			) : (
				<>
					<WatchlistAlerts items={items} window={win} />
					<WatchlistTools items={items} />
					<WatchlistControls
						items={items}
						visibleItems={visibleItems}
						selectedIds={selectedIds}
						statusFilter={statusFilter}
						tagFilter={tagFilter}
						onStatusFilterChange={setStatusFilter}
						onTagFilterChange={setTagFilter}
						onToggleAll={toggleAllVisible}
						onClearSelection={() => setSelectedIds(new Set())}
						onBulkUpdated={() => setSelectedIds(new Set())}
					/>
					{visibleItems.length === 0 ? (
						<EmptyState
							icon={StarIcon}
							title="No watchlist matches"
							hint="Try another status or tag filter."
						/>
					) : (
						<WatchlistList
							key={`${win}-${density}-${visibleItems.map((repo) => repo.id).join(",")}`}
							items={visibleItems}
							density={density}
							window={win}
							windowDays={WINDOW_DAYS[win]}
							selectedIds={selectedIds}
							onToggleSelection={toggleSelection}
						/>
					)}
				</>
			)}
		</div>
	);
}
