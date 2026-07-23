import { useState } from "react";
import RepoCard from "../components/RepoCard";
import DensityToggle from "../components/DensityToggle";
import { useRisers } from "../hooks/useRisers";
import { useDensity } from "../hooks/useDensity";

const WINDOWS = ["1d", "7d", "30d"] as const;
type Window = (typeof WINDOWS)[number];

export default function RisersPage() {
  const [window, setWindow] = useState<Window>("7d");
  const [density, setDensity] = useDensity();
  const { data, isLoading, error } = useRisers(window, 1);
  const windowLabel = window === "1d" ? "day" : window === "30d" ? "month" : "week";

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Fast Risers</h1>
        <div className="flex gap-2 items-center">
          <DensityToggle value={density} onChange={setDensity} />
          <select
            value={window}
            onChange={(e) => setWindow(e.target.value as Window)}
            className="bg-bg border border-border rounded-md px-2 py-1.5 text-text text-sm"
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>Last {w}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-muted text-sm">
        Repos gaining the most stars over the window, computed from our hourly snapshots.
      </p>
      {isLoading && <p className="text-muted">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{(error as Error).message}</p>}
      <div className="flex flex-col gap-3">
        {data?.items.map((repo) => (
          <RepoCard key={repo.id} repo={repo} density={density} deltaWindowLabel={windowLabel} />
        ))}
      </div>
    </div>
  );
}
