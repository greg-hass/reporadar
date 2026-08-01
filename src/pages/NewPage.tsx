import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RepoRow from "../components/RepoRow";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import LoadMore from "../components/LoadMore";
import { EmptyState, ErrorState } from "../components/States";
import { SparklesIcon } from "../components/icons";
import { useSearch } from "../hooks/useSearch";
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";
import { relativeTime, safeExternalUrl } from "../lib/format";
import type { Repo } from "../lib/types";
import PageHeader from "../components/PageHeader";

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
  const { data, isLoading, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSearch(
    { q: "stars:>1", createdSinceDays: Number(days), sort: "stars" },
    true
  );

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const navigate = useNavigate();
  const { sel, reset } = useRovingKeys(items.length, {
    onOpen: (i) => navigate(`/repo/${items[i].fullName}`),
    onExternal: (i) => window.open(safeExternalUrl(items[i].htmlUrl, items[i].fullName), "_blank", "noreferrer"),
  });

  const changeDays = (d: Days) => {
    setDays(d);
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <PageHeader
        icon={SparklesIcon}
        eyebrow="Fresh signals"
        title="New & rising"
        description="Recently created repos with early momentum"
        actions={(
          <div className="flex w-full min-w-0 gap-2 sm:w-auto">
            <div className="min-w-0 flex-[1.65] sm:flex-none">
              <SegmentedControl value={days} options={DAYS_OPTIONS} onChange={changeDays} ariaLabel="Created within" />
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
