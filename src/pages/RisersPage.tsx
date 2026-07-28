import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RepoRow from "../components/RepoRow";
import RiserRow from "../components/RiserRow";
import HeroRiser from "../components/HeroRiser";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import StatsBand from "../components/StatsBand";
import LoadMore from "../components/LoadMore";
import { EmptyState, ErrorState } from "../components/States";
import { useRisers } from "../hooks/useRisers";
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";

type Window = "1d" | "7d" | "30d";
const WINDOW_OPTIONS: { value: Window; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];
const WINDOW_DAYS: Record<Window, number> = { "1d": 1, "7d": 7, "30d": 30 };

export default function RisersPage() {
  const [win, setWin] = useState<Window>("7d");
  const [density, setDensity] = useDensity();
  const { data, isLoading, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useRisers(win);

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total;
  // #1 gets the hero spotlight; the list starts at #2 and paginates from there.
  const hero = items[0];
  const rest = items.slice(1);
  const navigate = useNavigate();
  const { sel, reset } = useRovingKeys(items.length, {
    onOpen: (i) => navigate(`/repo/${items[i].fullName}`),
    onExternal: (i) => window.open(items[i].htmlUrl, "_blank", "noreferrer"),
  });

  const changeWindow = (w: Window) => {
    setWin(w);
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <div className="radar-bg" aria-hidden="true" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <div className="eyebrow">Signal monitor · last {win}</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight mt-1">Trending</h1>
          <p className="text-xs text-muted mt-1">
            Most stars gained, computed from our hourly snapshots
          </p>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <SegmentedControl value={win} options={WINDOW_OPTIONS} onChange={changeWindow} ariaLabel="Time window" />
          <DensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

      <StatsBand />

      {isLoading ? (
        <RepoListSkeleton />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !hero ? (
        <EmptyState
          title="No risers yet"
          hint="Risers appear after the hourly snapshot job has run at least twice."
        />
      ) : (
        <>
          <HeroRiser repo={hero} windowDays={WINDOW_DAYS[win]} />
          {total !== undefined && (
            <p className="text-[11px] text-muted px-1">
              Showing {items.length} of {total.toLocaleString()} tracked repos
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
          <LoadMore
            hasNextPage={hasNextPage ?? false}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            loaded={items.length}
          />
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
