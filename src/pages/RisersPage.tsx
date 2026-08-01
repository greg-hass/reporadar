import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RepoRow from "../components/RepoRow";
import RiserRow from "../components/RiserRow";
import HeroRiser from "../components/HeroRiser";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import LoadMore from "../components/LoadMore";
import { EmptyState, ErrorState } from "../components/States";
import { useRisers } from "../hooks/useRisers";
import { useFavourites } from "../hooks/useFavourites";
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";
import { safeExternalUrl } from "../lib/format";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { TrendingUpIcon } from "../components/icons";

type Window = "1d" | "7d" | "30d";
type Scope = "global" | "watchlist";
const WINDOW_OPTIONS: { value: Window; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];
const WINDOW_DAYS: Record<Window, number> = { "1d": 1, "7d": 7, "30d": 30 };
const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "global", label: "Global GitHub" },
  { value: "watchlist", label: "Watchlist" },
];

export default function RisersPage() {
  const [win, setWin] = useState<Window>("7d");
  const [scope, setScope] = useState<Scope>("global");
  const [density, setDensity] = useDensity();
  const global = useRisers(win);
  const watchlist = useFavourites(win);
  const active = scope === "global" ? global : watchlist;

  const items = scope === "global" ? global.data?.pages.flatMap((p) => p.items) ?? [] : watchlist.data?.items ?? [];
  const total = scope === "global" ? global.data?.pages[0]?.total : watchlist.data?.total;
  // #1 gets the hero spotlight; the list starts at #2 and paginates from there.
  const hero = items[0];
  const rest = items.slice(1);
  const navigate = useNavigate();
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
      <div className="radar-bg" aria-hidden="true" />

      <PageHeader
        icon={TrendingUpIcon}
        eyebrow={`${scope === "global" ? "Global GitHub signals" : "Watchlist signals"} · last ${win}`}
        title="Trending"
        description={scope === "global" ? "Fast risers from the tracked GitHub discovery set" : "Repos on your watchlist, ranked by momentum"}
        actions={(
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-auto">
              <SegmentedControl value={scope} options={SCOPE_OPTIONS} onChange={setScope} ariaLabel="Trending scope" />
            </div>
            <div className="flex w-full min-w-0 gap-2 sm:w-auto">
              <div className="min-w-0 flex-[1.65] sm:flex-none">
                <SegmentedControl value={win} options={WINDOW_OPTIONS} onChange={changeWindow} ariaLabel="Time window" />
              </div>
              <div className="min-w-0 flex-1 sm:flex-none">
                <DensityToggle value={density} onChange={setDensity} />
              </div>
            </div>
          </div>
        )}
      />

      {active.isLoading ? (
        <RepoListSkeleton />
      ) : active.error ? (
        <ErrorState message={(active.error as Error).message} onRetry={() => active.refetch()} />
      ) : !hero ? (
        <EmptyState
          title={scope === "watchlist" ? "Your watchlist is empty" : "No risers yet"}
          hint={scope === "watchlist"
            ? "Add repos to your watchlist and come back here to see their momentum side by side."
            : "Risers appear after the hourly snapshot job has run at least twice."}
        >
          {scope === "watchlist" && (
            <Link to="/search" className="btn-primary px-4 py-2 text-xs mt-4">
              Find repos to watch
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          <HeroRiser repo={hero} windowDays={WINDOW_DAYS[win]} />
          {total !== undefined && (
            <p className="text-[11px] text-muted px-1">
              Showing {items.length} of {total.toLocaleString()} {scope === "global" ? "tracked repos" : "watchlist repos"}
            </p>
          )}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {rest.map((repo, i) =>
                density === "compact" ? (
                  <RepoRow
                    key={repo.id}
                    repo={repo}
                    rank={i + 2}
                    selected={sel === i + 1}
                    compact
                    stagger={i}
                    right={
                      <div className="text-right shrink-0">
                        <div className="font-mono tabular-nums text-sm font-bold text-success">
                          +{(repo.starDelta ?? 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-muted">· {win}</div>
                      </div>
                    }
                  />
                ) : (
                  <RiserRow
                    key={repo.id}
                    repo={repo}
                    rank={i + 2}
                    windowDays={WINDOW_DAYS[win]}
                    window={win}
                    selected={sel === i + 1}
                    stagger={i}
                  />
                )
              )}
            </div>
          )}
          {scope === "global" && (
            <LoadMore
              hasNextPage={global.hasNextPage ?? false}
              isFetchingNextPage={global.isFetchingNextPage}
              fetchNextPage={global.fetchNextPage}
              loaded={items.length}
            />
          )}
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
