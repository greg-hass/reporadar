import { useStats } from "../hooks/useStats";
import { compactNumber, relativeTime } from "../lib/format";

/** The Observatory stats band: tracked repos, snapshots, stars gained, last run. */
export default function StatsBand() {
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
