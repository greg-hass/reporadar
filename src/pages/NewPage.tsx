import { useState } from "react";
import RepoCard from "../components/RepoCard";
import DensityToggle from "../components/DensityToggle";
import { useSearch } from "../hooks/useSearch";
import { useDensity } from "../hooks/useDensity";

const DAYS_OPTIONS = [1, 7, 30] as const;

export default function NewPage() {
  const [days, setDays] = useState<number>(7);
  const [density, setDensity] = useDensity();
  const { data, isLoading, error } = useSearch(
    { q: "stars:>1", createdSinceDays: days, sort: "updated" },
    true
  );

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">New repos</h1>
        <div className="flex gap-2 items-center">
          <DensityToggle value={density} onChange={setDensity} />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-bg border border-border rounded-md px-2 py-1.5 text-text text-sm"
          >
            {DAYS_OPTIONS.map((d) => (
              <option key={d} value={d}>Last {d} days</option>
            ))}
          </select>
        </div>
      </div>
      {isLoading && <p className="text-muted">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{(error as Error).message}</p>}
      <div className="flex flex-col gap-3">
        {data?.items.map((repo) => (
          <RepoCard key={repo.id} repo={repo} density={density} />
        ))}
      </div>
    </div>
  );
}
