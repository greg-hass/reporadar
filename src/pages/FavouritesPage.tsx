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
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary shrink-0">
            <StarIcon size={19} />
          </div>
          <div>
            <div className="eyebrow !text-[9px]">Pinned signals</div>
            <h1 className="text-lg font-bold leading-tight mt-0.5">Watchlist</h1>
            <p className="text-xs text-muted">Repos you are watching, snapshotted hourly</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
          <SegmentedControl value={win} options={WINDOW_OPTIONS} onChange={changeWindow} ariaLabel="Time window" />
          <DensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

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
