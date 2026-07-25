import { useEffect, useRef } from "react";

interface Props {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** total items loaded so far (for the end marker) */
  loaded: number;
}

/** Infinite-scroll sentinel: loads the next page when scrolled into view. */
export default function LoadMore({ hasNextPage, isFetchingNextPage, fetchNextPage, loaded }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  if (!hasNextPage) {
    return loaded > 0 ? (
      <p className="text-center text-[11px] text-muted py-3">
        End of results · {loaded.toLocaleString()} loaded
      </p>
    ) : null;
  }

  return (
    <div ref={ref}>
      {isFetchingNextPage ? (
        <div className="panel panel-row">
          <div className="skeleton w-8 h-8 !rounded-lg shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-3.5 w-2/5" />
            <div className="skeleton h-2.5 w-3/5 mt-2 hidden sm:block" />
          </div>
          <div className="skeleton h-4 w-12 shrink-0" />
        </div>
      ) : (
        <button
          onClick={fetchNextPage}
          className="w-full text-center text-xs text-muted hover:text-text transition-colors py-3"
        >
          Load more
        </button>
      )}
    </div>
  );
}
