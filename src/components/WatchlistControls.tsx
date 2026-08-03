import { useState } from "react";
import type {
  WatchlistPatch,
  WatchlistRepo,
  WatchlistStatus,
} from "../lib/types";
import { useUpdateWatchlist } from "../hooks/useFavourites";

export type StatusFilter = "all" | WatchlistStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "watching", label: "Watching" },
  { value: "building", label: "Building" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

interface Props {
  items: WatchlistRepo[];
  visibleItems: WatchlistRepo[];
  selectedIds: Set<number>;
  statusFilter: StatusFilter;
  tagFilter: string;
  onStatusFilterChange: (value: StatusFilter) => void;
  onTagFilterChange: (value: string) => void;
  onToggleAll: () => void;
  onClearSelection: () => void;
  onBulkUpdated: () => void;
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

export default function WatchlistControls({
  items,
  visibleItems,
  selectedIds,
  statusFilter,
  tagFilter,
  onStatusFilterChange,
  onTagFilterChange,
  onToggleAll,
  onClearSelection,
  onBulkUpdated,
}: Props) {
  const update = useUpdateWatchlist();
  const [bulkStatus, setBulkStatus] = useState<WatchlistStatus>("watching");
  const [bulkTags, setBulkTags] = useState("");
  const tags = [...new Set(items.flatMap((repo) => repo.watchlist.tags))].sort();
  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((repo) => selectedIds.has(repo.id));

  const apply = (patch: WatchlistPatch) => {
    if (!selectedIds.size) return;
    update.mutate(
      { ids: [...selectedIds], patch },
      { onSuccess: onBulkUpdated },
    );
  };

  return (
    <section className="panel flex flex-col gap-3 p-3" aria-label="Watchlist filters and bulk actions">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted">
          <span className="shrink-0 uppercase tracking-wider">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-text outline-none focus:border-primary/60 sm:max-w-[180px]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted">
          <span className="shrink-0 uppercase tracking-wider">Tag</span>
          <select
            value={tagFilter}
            onChange={(event) => onTagFilterChange(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-text outline-none focus:border-primary/60 sm:max-w-[180px]"
          >
            <option value="all">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted sm:ml-auto">
          Showing {visibleItems.length} of {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-xs text-text">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={onToggleAll}
            disabled={!visibleItems.length}
            className="accent-primary"
          />
          Select visible
        </label>
        {selectedIds.size > 0 && (
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <span className="text-xs font-semibold text-primary">
              {selectedIds.size} selected
            </span>
            <select
              aria-label="Bulk status"
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as WatchlistStatus)}
              className="rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-text outline-none focus:border-primary/60"
            >
              {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={update.isPending}
              onClick={() => apply({ status: bulkStatus })}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:border-primary/50 hover:text-text disabled:opacity-50"
            >
              Set status
            </button>
            <input
              value={bulkTags}
              onChange={(event) => setBulkTags(event.target.value)}
              aria-label="Bulk tags"
              placeholder="tags, comma separated"
              className="min-w-0 rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-text outline-none placeholder:text-muted/60 focus:border-primary/60 sm:w-44"
            />
            <button
              type="button"
              disabled={update.isPending}
              onClick={() => apply({ tags: parseTags(bulkTags) })}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:border-primary/50 hover:text-text disabled:opacity-50"
            >
              Set tags
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2 py-2 text-xs text-muted hover:text-text"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
