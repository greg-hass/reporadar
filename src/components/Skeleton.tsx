/** Shimmering placeholder rows for a leaderboard panel. */
export default function RepoListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="panel divide-y divide-border/60" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel-row">
          <div className="skeleton w-8 h-8 !rounded-lg shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-3.5 w-2/5" />
            <div className="skeleton h-2.5 w-3/5 mt-2 hidden sm:block" />
          </div>
          <div className="skeleton h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}
