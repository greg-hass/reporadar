import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RepoRow from "../components/RepoRow";
import RiserRow from "../components/RiserRow";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { StarIcon } from "../components/icons";
import { useFavourites } from "../hooks/useFavourites";
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";
import { safeExternalUrl } from "../lib/format";
import WatchlistAlerts from "../components/WatchlistAlerts";
import WatchlistTools from "../components/WatchlistTools";
import PageHeader from "../components/PageHeader";

type Window = "1d" | "7d" | "30d";
const WINDOW_OPTIONS: { value: Window; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];
const WINDOW_DAYS: Record<Window, number> = { "1d": 1, "7d": 7, "30d": 30 };

export default function FavouritesPage() {
  const [win, setWin] = useState<Window>("7d");
  const [density, setDensity] = useDensity();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useFavourites(win);

  const items = data?.items ?? [];
  const { sel, reset } = useRovingKeys(items.length, {
    onOpen: (i) => navigate(`/repo/${items[i].fullName}`),
    onExternal: (i) => window.open(safeExternalUrl(items[i].htmlUrl, items[i].fullName), "_blank", "noreferrer"),
  });

  const changeWindow = (w: Window) => {
    setWin(w);
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <PageHeader
        icon={StarIcon}
        eyebrow="Pinned signals"
        title="Watchlist"
        description="Repos you are watching, snapshotted hourly"
        actions={(
          <div className="flex w-full min-w-0 gap-2 sm:w-auto">
            <div className="min-w-0 flex-[1.65] sm:flex-none">
              <SegmentedControl value={win} options={WINDOW_OPTIONS} onChange={changeWindow} ariaLabel="Time window" />
            </div>
            <div className="min-w-0 flex-1 sm:flex-none">
              <DensityToggle value={density} onChange={setDensity} />
            </div>
          </div>
        )}
      />

      {isLoading ? (
        <RepoListSkeleton />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
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
          <div className="flex flex-col gap-2.5">
            {items.map((repo, i) =>
              density === "compact" ? (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  rank={i + 1}
                  selected={sel === i}
                  compact
                  stagger={i}
                  right={
                    repo.starDelta != null ? (
                      <div className="text-right shrink-0">
                        <div className="font-mono tabular-nums text-sm font-bold text-success">
                          +{repo.starDelta.toLocaleString()}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-muted">· {win}</div>
                      </div>
                    ) : undefined
                  }
                />
              ) : (
                <RiserRow
                  key={repo.id}
                  repo={repo}
                  rank={i + 1}
                  windowDays={WINDOW_DAYS[win]}
                  window={win}
                  selected={sel === i}
                  stagger={i}
                />
              )
            )}
          </div>
          <p className="hidden md:block text-[11px] text-muted text-right">
            <kbd className="border border-border rounded px-1">j</kbd>{" "}
            <kbd className="border border-border rounded px-1">k</kbd> navigate ·{" "}
            <kbd className="border border-border rounded px-1">↵</kbd> details ·{" "}
            <kbd className="border border-border rounded px-1">o</kbd> github
          </p>
        </>
      )}
    </div>
  );
}
