import { useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import FilterRail from "../components/FilterRail";
import SortControl from "../components/SortControl";
import DensityToggle from "../components/DensityToggle";
import RepoCard from "../components/RepoCard";
import { useSearch } from "../hooks/useSearch";
import { useDensity } from "../hooks/useDensity";
import type { SortKey } from "../lib/types";

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const language = sp.get("language") ?? "";
  const minStars = Number(sp.get("minStars") ?? 0);
  const createdSinceDays = Number(sp.get("createdSinceDays") ?? 0);
  const sort = (sp.get("sort") as SortKey) ?? "best-match";
  const [density, setDensity] = useDensity();

  const patch = (p: Record<string, string | number>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(p)) {
      if (v === "" || v === 0) next.delete(k);
      else next.set(k, String(v));
    }
    setSp(next);
  };

  const enabled = q.length > 0;
  const { data, isLoading, error } = useSearch(
    { q, language: language || undefined, minStars: minStars || undefined, createdSinceDays: createdSinceDays || undefined, sort },
    enabled
  );

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <SearchBar initial={q} onSearch={(val) => patch({ q: val })} />
      <FilterRail
        language={language}
        minStars={minStars}
        createdSinceDays={createdSinceDays}
        onChange={patch}
      />
      {enabled && (
        <div className="flex items-center justify-between">
          <span className="text-muted text-sm">
            {isLoading ? "Searching…" : data ? `${data.total.toLocaleString()} results` : ""}
          </span>
          <div className="flex gap-2 items-center">
            <DensityToggle value={density} onChange={setDensity} />
            <SortControl value={sort} onChange={(s) => patch({ sort: s })} />
          </div>
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{(error as Error).message}</p>}
      <div className="flex flex-col gap-3">
        {data?.items.map((repo) => (
          <RepoCard key={repo.id} repo={repo} density={density} />
        ))}
      </div>
      {!enabled && (
        <p className="text-muted text-sm">Type a query above to search across GitHub.</p>
      )}
    </div>
  );
}
