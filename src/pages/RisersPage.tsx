import { useEffect, useState } from "react";
import RepoCard from "../components/RepoCard";
import RiserRow from "../components/RiserRow";
import DensityToggle from "../components/DensityToggle";
import SegmentedControl from "../components/SegmentedControl";
import RepoListSkeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { useRisers } from "../hooks/useRisers";
import { useStats } from "../hooks/useStats";
import { useDensity } from "../hooks/useDensity";
import { compactNumber, relativeTime } from "../lib/format";

type Window = "1d" | "7d" | "30d";
const WINDOW_OPTIONS: { value: Window; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];
const WINDOW_DAYS: Record<Window, number> = { "1d": 1, "7d": 7, "30d": 30 };

function StatsBand() {
  const { data, isLoading, error } = useStats();

  const cell = (label: string, value: React.ReactNode) => (
    <div className="stat-panel">
      <div className="eyebrow !text-[9px]">{label}</div>
      <div className="font-mono tabular-nums text-xl font-bold mt-1.5 flex items-center gap-2">
        {value}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="stat-panel">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton h-6 w-16 mt-2.5" />
          </div>
        ))}
      </div>
    );
  }
  // A stats failure must not take the page down — show dashes and carry on.
  if (error || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["Repos tracked", "Snapshots today", "Stars gained today", "Last snapshot"].map((l) =>
          cell(l, <span key={l} className="text-muted">—</span>)
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cell("Repos tracked", data.reposTracked.toLocaleString())}
      {cell("Snapshots today", data.snapshotsToday.toLocaleString())}
      {cell(
        "Stars gained today",
        <span className="text-success">+{compactNumber(data.starsGainedToday)}</span>
      )}
      {cell(
        "Last snapshot",
        data.lastSnapshotAt ? (
          <>
            <span className="pulse-dot" />
            <span className="text-base">{relativeTime(data.lastSnapshotAt)}</span>
          </>
        ) : (
          <span className="text-muted text-sm">no snapshots yet</span>
        )
      )}
    </div>
  );
}

export default function RisersPage() {
  const [win, setWin] = useState<Window>("7d");
  const [density, setDensity] = useDensity();
  const [sel, setSel] = useState(-1);
  const { data, isLoading, error, refetch } = useRisers(win, 1);
  const windowLabel = win === "1d" ? "day" : win === "30d" ? "month" : "week";

  // Keyboard nav: j/k moves through the leaderboard, Enter opens the repo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const items = data?.items;
      if (!items?.length || density !== "rich") return;
      if (e.key === "j") setSel((s) => Math.min(s + 1, items.length - 1));
      else if (e.key === "k") setSel((s) => Math.max(s - 1, 0));
      else if (e.key === "Enter" && sel >= 0 && sel < items.length) {
        window.open(items[sel].htmlUrl, "_blank", "noreferrer");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data, sel, density]);

  const changeWindow = (w: Window) => {
    setWin(w);
    setSel(-1);
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <div className="radar-bg" aria-hidden="true" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <div className="eyebrow">Signal monitor · last {win}</div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">Fast Risers</h1>
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
        <RepoListSkeleton density={density} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="No risers yet"
          hint="Risers appear after the hourly snapshot job has run at least twice."
        />
      ) : density === "compact" ? (
        <div className="flex flex-col gap-3">
          {data?.items.map((repo, i) => (
            <RepoCard key={repo.id} repo={repo} density={density} deltaWindowLabel={windowLabel} stagger={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data?.items.map((repo, i) => (
              <RiserRow
                key={repo.id}
                repo={repo}
                rank={i + 1}
                windowDays={WINDOW_DAYS[win]}
                window={win}
                selected={sel === i}
                stagger={i}
              />
            ))}
          </div>
          <p className="hidden md:block text-[11px] text-muted text-right">
            <kbd className="border border-border rounded px-1">j</kbd>{" "}
            <kbd className="border border-border rounded px-1">k</kbd> navigate ·{" "}
            <kbd className="border border-border rounded px-1">↵</kbd> open
          </p>
        </>
      )}
    </div>
  );
}
