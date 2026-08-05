import { useSearchParams, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import FilterRail from "../components/FilterRail";
import SortControl from "../components/SortControl";
import DensityToggle from "../components/DensityToggle";
import RepoRow from "../components/RepoRow";
import RepoListSkeleton from "../components/Skeleton";
import LoadMore from "../components/LoadMore";
import { EmptyState, ErrorState } from "../components/States";
import { Logo, SearchIcon } from "../components/icons";
import { useSearch } from "../hooks/useSearch";
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";
import { safeExternalUrl } from "../lib/format";
import type { Repo, SortKey } from "../lib/types";
import SavedSearches from "../components/SavedSearches";
import type { SavedSearch } from "../hooks/useSavedSearches";
import PageHeader from "../components/PageHeader";

const EXAMPLES = ["terminal emulator", "llm agent framework", "self-hosted dashboard"];

function starsBlock(repo: Repo) {
  return (
    <div className="hidden md:block text-right shrink-0">
      <div className="font-mono tabular-nums text-sm">{repo.starsTotal.toLocaleString()}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted">stars</div>
    </div>
  );
}

function topicList(value: string): string[] {
  return [...new Set(value.split(",").map((topic) => topic.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
}

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const language = sp.get("language") ?? "";
  const topics = sp.get("topics") ?? "";
  const minStars = Number(sp.get("minStars") ?? 0);
  const createdSinceDays = Number(sp.get("createdSinceDays") ?? 0);
  const pushedSinceDays = Number(sp.get("pushedSinceDays") ?? 0);
  const sort = (sp.get("sort") as SortKey) ?? "best-match";
  const [density, setDensity] = useDensity();

  const enabled = q.length > 0;
  const { data, isLoading, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSearch(
    {
      q,
      language: language || undefined,
      topics: topicList(topics),
      minStars: minStars || undefined,
      createdSinceDays: createdSinceDays || undefined,
      pushedSinceDays: pushedSinceDays || undefined,
      sort,
    },
    enabled
  );

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total;
  const navigate = useNavigate();
  const { sel, reset } = useRovingKeys(items.length, {
    onOpen: (i) => navigate(`/repo/${items[i].fullName}`),
    onExternal: (i) => window.open(safeExternalUrl(items[i].htmlUrl, items[i].fullName), "_blank", "noreferrer"),
  });

  const patch = (p: Record<string, string | number>) => {
    reset();
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(p)) {
      const value = k === "topics" ? topicList(String(v)).join(",") : v;
      if (value === "" || value === 0) next.delete(k);
      else next.set(k, String(value));
    }
    setSp(next);
  };

  const applySavedSearch = (search: SavedSearch) => {
    patch({
      q: search.q,
      language: search.language,
      topics: search.topics,
      minStars: search.minStars,
      createdSinceDays: search.createdSinceDays,
      pushedSinceDays: search.pushedSinceDays,
      sort: search.sort,
    });
  };

  return (
    <div className="max-w-5xl mx-auto w-full min-w-0 flex flex-col gap-4">
      <PageHeader
        icon={SearchIcon}
        eyebrow="Repository search"
        title="Search GitHub"
        description="Find repos by language, stars, freshness, and more"
      />
      {/* key resets the input when the query changes from outside (e.g. example chips) */}
      <SearchBar key={q} initial={q} onSearch={(val) => patch({ q: val })} />

      {!enabled ? (
        <div className="flex flex-col items-center text-center pt-14 md:pt-24 pb-10 animate-fade-up">
          <Logo size={56} />
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mt-6">
            Find your next favorite repo
          </h1>
          <p className="text-muted text-sm md:text-base mt-2.5 max-w-md">
            Search across GitHub with filters for language, stars, and freshness — or browse
            what's new and what's rising.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-7">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => patch({ q: ex })}
                className="text-xs px-3.5 py-2 rounded-full bg-surface text-muted hover:bg-elevated hover:text-text transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <FilterRail
            language={language}
            topics={topics}
            minStars={minStars}
            createdSinceDays={createdSinceDays}
            pushedSinceDays={pushedSinceDays}
            onChange={patch}
          />
          <SavedSearches
            query={{ q, language, topics, minStars, createdSinceDays, pushedSinceDays, sort }}
            onApply={applySavedSearch}
          />
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="eyebrow !text-[10px]">
              {isLoading
                ? "Searching…"
                : total !== undefined
                  ? `Showing ${items.length} of ~${Math.min(total, 1000).toLocaleString()} results`
                  : ""}
            </span>
            <div className="flex min-w-0 gap-2 items-center ml-auto">
              <DensityToggle value={density} onChange={setDensity} />
              <SortControl value={sort} onChange={(s) => patch({ sort: s })} />
            </div>
          </div>
          {isLoading ? (
            <RepoListSkeleton />
          ) : error ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <EmptyState title="No repos found" hint="Try a broader query or loosen the filters above." />
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
                    right={starsBlock(repo)}
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
        </>
      )}
    </div>
  );
}
