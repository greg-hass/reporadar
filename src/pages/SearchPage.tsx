import { useSearchParams, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import FilterRail from "../components/FilterRail";
import SortControl from "../components/SortControl";
import DensityToggle from "../components/DensityToggle";
import RepoRow from "../components/RepoRow";
import RepoListSkeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { Logo } from "../components/icons";
import { useSearch } from "../hooks/useSearch";
import { useDensity } from "../hooks/useDensity";
import { useRovingKeys } from "../hooks/useRovingKeys";
import type { Repo, SortKey } from "../lib/types";

const EXAMPLES = ["terminal emulator", "llm agent framework", "self-hosted dashboard"];

function starsBlock(repo: Repo) {
  return (
    <div className="hidden md:block text-right shrink-0">
      <div className="font-mono tabular-nums text-sm">{repo.starsTotal.toLocaleString()}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted">stars</div>
    </div>
  );
}

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const language = sp.get("language") ?? "";
  const minStars = Number(sp.get("minStars") ?? 0);
  const createdSinceDays = Number(sp.get("createdSinceDays") ?? 0);
  const sort = (sp.get("sort") as SortKey) ?? "best-match";
  const [density, setDensity] = useDensity();

  const enabled = q.length > 0;
  const { data, isLoading, error, refetch } = useSearch(
    { q, language: language || undefined, minStars: minStars || undefined, createdSinceDays: createdSinceDays || undefined, sort },
    enabled
  );

  const items = data?.items ?? [];
  const navigate = useNavigate();
  const { sel, reset } = useRovingKeys(items.length, {
    onOpen: (i) => navigate(`/repo/${items[i].fullName}`),
    onExternal: (i) => window.open(items[i].htmlUrl, "_blank", "noreferrer"),
  });

  const patch = (p: Record<string, string | number>) => {
    reset();
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(p)) {
      if (v === "" || v === 0) next.delete(k);
      else next.set(k, String(v));
    }
    setSp(next);
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <div className="eyebrow">Query the archive</div>
      {/* key resets the input when the query changes from outside (e.g. example chips) */}
      <SearchBar key={q} initial={q} onSearch={(val) => patch({ q: val })} />

      {!enabled ? (
        <div className="flex flex-col items-center text-center pt-14 md:pt-24 pb-10 animate-fade-up">
          <Logo size={56} />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-6">
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
                className="text-xs px-3.5 py-2 rounded-full bg-surface border border-border text-muted hover:text-text hover:border-primary/50 transition-colors"
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
            minStars={minStars}
            createdSinceDays={createdSinceDays}
            onChange={patch}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow !text-[10px]">
              {isLoading ? "Searching…" : data ? `${data.total.toLocaleString()} results` : ""}
            </span>
            <div className="flex gap-2 items-center ml-auto">
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
