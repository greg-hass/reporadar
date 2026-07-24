import type { Density } from "../hooks/useDensity";

function RichSkeleton() {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="skeleton w-9 h-9 !rounded-lg shrink-0" />
        <div className="flex-1">
          <div className="skeleton h-4 w-2/5" />
          <div className="skeleton h-3 w-full mt-2.5" />
          <div className="skeleton h-3 w-3/4 mt-2" />
          <div className="flex gap-3 mt-3.5">
            <div className="skeleton h-3 w-14" />
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactSkeleton() {
  return (
    <div className="card flex items-center gap-3 px-4 min-h-[46px] py-2">
      <div className="skeleton w-6 h-6 !rounded-md shrink-0" />
      <div className="skeleton h-3.5 w-44" />
      <div className="skeleton h-3 flex-1 hidden md:block" />
      <div className="skeleton h-3 w-10 ml-auto" />
    </div>
  );
}

export default function RepoListSkeleton({
  density,
  count = 6,
}: {
  density: Density;
  count?: number;
}) {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading">
      {Array.from({ length: count }, (_, i) =>
        density === "compact" ? <CompactSkeleton key={i} /> : <RichSkeleton key={i} />
      )}
    </div>
  );
}
