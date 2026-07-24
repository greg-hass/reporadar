import { useState } from "react";
import RepoCard from "../components/RepoCard";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { SparklesIcon } from "../components/icons";
import { useSearch } from "../hooks/useSearch";
import { useDensity } from "../hooks/useDensity";

type Days = "1" | "7" | "30";
const DAYS_OPTIONS: { value: Days; label: string }[] = [
  { value: "1", label: "24h" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

export default function NewPage() {
  const [days, setDays] = useState<Days>("7");
  const [density, setDensity] = useDensity();
  const { data, isLoading, error, refetch } = useSearch(
    { q: "stars:>1", createdSinceDays: Number(days), sort: "updated" },
    true
  );

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-4">
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
          <SegmentedControl value={days} options={DAYS_OPTIONS} onChange={setDays} ariaLabel="Created within" />
          <DensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

      {isLoading ? (
        <RepoListSkeleton density={density} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState title="Nothing new here" hint="No recently created repos matched. Try a wider window." />
      ) : (
        <div className="flex flex-col gap-3">
          {data?.items.map((repo, i) => (
            <RepoCard key={repo.id} repo={repo} density={density} stagger={i} />
          ))}
        </div>
      )}
    </div>
  );
}
