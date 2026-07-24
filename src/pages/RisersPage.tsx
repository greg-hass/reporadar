import { useState } from "react";
import RepoCard from "../components/RepoCard";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { TrendingUpIcon } from "../components/icons";
import { useRisers } from "../hooks/useRisers";
import { useDensity } from "../hooks/useDensity";

type Window = "1d" | "7d" | "30d";
const WINDOW_OPTIONS: { value: Window; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export default function RisersPage() {
  const [window, setWindow] = useState<Window>("7d");
  const [density, setDensity] = useDensity();
  const { data, isLoading, error, refetch } = useRisers(window, 1);
  const windowLabel = window === "1d" ? "day" : window === "30d" ? "month" : "week";

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary shrink-0">
            <TrendingUpIcon size={19} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Fast Risers</h1>
            <p className="text-xs text-muted">Most stars gained, from our hourly snapshots</p>
          </div>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <SegmentedControl value={window} options={WINDOW_OPTIONS} onChange={setWindow} ariaLabel="Time window" />
          <DensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

      {isLoading ? (
        <RepoListSkeleton density={density} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="No risers yet"
          hint="Risers appear after the hourly snapshot job has run at least twice."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data?.items.map((repo, i) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              density={density}
              deltaWindowLabel={windowLabel}
              stagger={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
