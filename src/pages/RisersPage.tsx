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
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";
import { safeExternalUrl } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { TrendingUpIcon } from "../components/icons";

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
  const risers = useRisers(win);

  const items = risers.data?.pages.flatMap((p) => p.items) ?? [];
  const total = risers.data?.pages[0]?.total;
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
        eyebrow={`Global GitHub signals · last ${win}`}
        title="Trending"
        description="Fast risers from the tracked GitHub discovery set"
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

      {risers.isLoading ? (
        <RepoListSkeleton />
      ) : risers.error ? (
        <ErrorState message={(risers.error as Error).message} onRetry={() => risers.refetch()} />
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
            hasNextPage={risers.hasNextPage ?? false}
            isFetchingNextPage={risers.isFetchingNextPage}
            fetchNextPage={risers.fetchNextPage}
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
