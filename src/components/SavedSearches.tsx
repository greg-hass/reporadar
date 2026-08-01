import type { SavedSearch } from "../hooks/useSavedSearches";
import { useSavedSearches } from "../hooks/useSavedSearches";
import type { SortKey } from "../lib/types";
import { CheckIcon, CopyIcon } from "./icons";

interface QueryState {
  q: string;
  language: string;
  minStars: number;
  createdSinceDays: number;
  sort: SortKey;
}

export default function SavedSearches({ query, onApply }: { query: QueryState; onApply: (search: SavedSearch) => void }) {
  const { saved, save, remove } = useSavedSearches();
  const currentId = `${query.q}:${query.language}:${query.minStars}:${query.createdSinceDays}:${query.sort}`;
  const isSaved = saved.some((item) => item.id === currentId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow !text-[9px]">Saved research</span>
      {query.q && (
        <button
          type="button"
          onClick={() => save({ ...query, label: query.q })}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted hover:border-primary/50 hover:text-text transition-colors"
        >
          {isSaved ? <CheckIcon size={12} className="text-accent" /> : <CopyIcon size={12} />}
          {isSaved ? "Saved" : "Save this search"}
        </button>
      )}
      {saved.map((item) => (
        <span key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">
          <button type="button" onClick={() => onApply(item)} className="truncate hover:text-text" title={item.label}>
            {item.label}
          </button>
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Remove saved search ${item.label}`}
            className="shrink-0 text-muted/60 hover:text-text"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
