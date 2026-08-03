import { useEffect, useState } from "react";
import type { PulseItem, PulseResponse, Stats } from "../lib/types";
import { compactNumber, relativeTime } from "../lib/format";
import { InboxIcon, XIcon } from "./icons";
import RepoRow from "./RepoRow";
import { usePulse } from "../hooks/usePulse";

const DISMISSED_KEY = "reporadar-pulse-dismissed";

function itemKey(item: PulseItem): string {
  return `${item.kind}:${item.repo.id}:${item.lastSnapshotAt}:${item.starDelta}`;
}

function readDismissed(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed.slice(0, 100)
      : [];
  } catch {
    return [];
  }
}

function PulseHeader({
  hasSeen,
  count,
  isLoading,
  hasData,
  onMarkSeen,
}: {
  hasSeen: boolean;
  count: number;
  isLoading: boolean;
  hasData: boolean;
  onMarkSeen: () => void;
}) {
  const summary = count > 0
    ? `${count} signal${count === 1 ? "" : "s"} worth a look.`
    : "You are caught up. New signals will appear after the next snapshot.";

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <InboxIcon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="eyebrow !text-[9px]">{hasSeen ? "Since your last visit" : "Recent signals"}</span>
        <h2 id="pulse-heading" className="mt-1 text-sm font-semibold">What changed?</h2>
        <p className="mt-1 text-xs text-muted">{summary}</p>
      </div>
      <button
        type="button"
        onClick={onMarkSeen}
        disabled={isLoading || !hasData}
        className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-primary/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
      >
        Mark read
      </button>
    </div>
  );
}

function PulseItemRow({ item, onDismiss }: { item: PulseItem; onDismiss: (item: PulseItem) => void }) {
  const isWatchlistChange = item.kind === "watchlist-change";
  const hasDelta = item.starDelta > 0;
  return (
    <div>
      <RepoRow
        repo={item.repo}
        right={(
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <div className="font-mono tabular-nums text-sm font-bold text-success">
                {hasDelta ? `+${compactNumber(item.starDelta)}` : "New"}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-muted">
                {hasDelta ? "stars" : "signal"}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Dismiss ${item.repo.fullName} from Pulse`}
              title="Dismiss signal"
              onClick={(event) => {
                event.stopPropagation();
                onDismiss(item);
              }}
              className="rounded-lg p-1.5 text-muted/60 transition-colors hover:bg-elevated hover:text-text"
            >
              <XIcon size={14} />
            </button>
          </div>
        )}
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-1 text-[10px] text-muted sm:px-4">
        <span className={isWatchlistChange ? "text-accent" : "text-primary"}>
          {isWatchlistChange ? "Watchlist change" : "New tracked signal"}
        </span>
        <span>·</span>
        <span>{item.snapshotCount} snapshot{item.snapshotCount === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>updated {relativeTime(item.lastSnapshotAt)}</span>
      </div>
    </div>
  );
}

function PulseSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="panel-row panel-row-rich">
          <div className="skeleton h-11 w-11 shrink-0 !rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton mt-2 h-3 w-full max-w-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PulseError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : "Pulse could not be loaded.";
  return (
    <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 px-3.5 py-3">
      <p className="text-xs font-semibold">Pulse unavailable</p>
      <p className="mt-1 text-[11px] text-muted">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary mt-3 px-3 py-1.5 text-[11px]">
        Try again
      </button>
    </div>
  );
}

function TrackingSummary({ stats }: { stats: Stats }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 pt-3 text-[10px] text-muted">
      <span>Tracking {stats.reposTracked.toLocaleString()} repos</span>
      <span>·</span>
      <span>{stats.snapshotCount.toLocaleString()} snapshots</span>
      <span>·</span>
      <span>Last snapshot {stats.lastSnapshotAt ? relativeTime(stats.lastSnapshotAt) : "not yet"}</span>
    </div>
  );
}

function PulseBody({
  data,
  items,
  stats,
  isLoading,
  error,
  onRetry,
  onDismiss,
}: {
  data: PulseResponse | undefined;
  items: PulseItem[];
  stats: Stats | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onDismiss: (item: PulseItem) => void;
}) {
  if (isLoading) return <PulseSkeleton />;
  if (error) return <PulseError error={error} onRetry={onRetry} />;

  return (
    <>
      {items.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5">
          {items.map((item) => (
            <PulseItemRow key={itemKey(item)} item={item} onDismiss={onDismiss} />
          ))}
        </div>
      )}
      {data && items.length === 0 && data.items.length > 0 && (
        <p className="mt-4 rounded-xl bg-elevated/60 px-3.5 py-3 text-xs text-muted">
          You cleared these signals. Marking the Pulse read will start the next window from now.
        </p>
      )}
      {stats && <TrackingSummary stats={stats} />}
    </>
  );
}

export default function ChangeInbox() {
  const { data, isLoading, error, refetch, hasSeen, markSeen } = usePulse();
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    } catch {
      // Dismissals are a convenience; Pulse remains usable without storage.
    }
  }, [dismissed]);

  const dismiss = (item: PulseItem) => {
    const key = itemKey(item);
    setDismissed((current) => [key, ...current.filter((entry) => entry !== key)].slice(0, 100));
  };

  const items = data?.items.filter((item) => !dismissed.includes(itemKey(item))) ?? [];

  return (
    <section className="panel p-4 sm:p-5 animate-fade-up" aria-labelledby="pulse-heading">
      <PulseHeader
        hasSeen={hasSeen}
        count={items.length}
        isLoading={isLoading}
        hasData={Boolean(data)}
        onMarkSeen={markSeen}
      />
      <PulseBody
        data={data}
        items={items}
        stats={data?.stats}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        onDismiss={dismiss}
      />
    </section>
  );
}
