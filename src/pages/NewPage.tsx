import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RepoRow from "../components/RepoRow";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { SparklesIcon } from "../components/icons";
import { useSearch } from "../hooks/useSearch";
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";
import { relativeTime } from "../lib/format";
import type { Repo } from "../lib/types";

type Days = "1" | "7" | "30";
const DAYS_OPTIONS: { value: Days; label: string }[] = [
  { value: "1", label: "24h" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

function ageBlock(repo: Repo) {
  return (
    <div className="text-right shrink-0">
      <div className="font-mono tabular-nums text-[11px]">{relativeTime(repo.createdAt)}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted">created</div>
    </div>
  );
}

export default function NewPage() {
  const [days, setDays] = useState<Days>("7");
  const [density, setDensity] = useDensity();
  const { data, isLoading, error, refetch } = useSearch(
    { q: "stars:>1", createdSinceDays: Number(days), sort: "updated" },
    true
  );

  const items = data?.items ?? [];
  const navigate = useNavigate();
  const { sel, reset } = useRovingKeys(items.length, {
    onOpen: (i) => navigate(`/repo/${items[i].fullName}`),
    onExternal: (i) => window.open(items[i].htmlUrl, "_blank", "noreferrer"),
  });

  const changeDays = (d: Days) => {
    setDays(d);
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary shrink-0">
            <SparklesIcon size={19} />
          </div>
          <div>
            <div className="eyebrow !text-[9px]">Fresh signals</div>
            <h1 className="text-lg font-bold leading-tight mt-0.5">New repos</h1>
            <p className="text-xs text-muted">Freshly created and already gaining stars</p>
          </div>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <SegmentedControl value={days} options={DAYS_OPTIONS} onChange={changeDays} ariaLabel="Created within" />
          <DensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

      {isLoading ? (
        <RepoListSkeleton />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing new here" hint="No recently created repos matched. Try a wider window." />
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {items.map((repo, i) => (
              <RepoRow
                key={repo.id}
                repo={repo}
                rank={i + 1}
                selected={sel === i}
                compact={density === "compact"}
                stagger={i}
                right={ageBlock(repo)}
              />
            ))}
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
