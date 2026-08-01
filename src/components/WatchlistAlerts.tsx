import { useState } from "react";
import type { Repo } from "../lib/types";
import { BellIcon } from "./icons";
import { useToast } from "./Toast";
import { useWatchlistAlerts, useWatchlistSettings } from "../hooks/useWatchlistAlerts";

export default function WatchlistAlerts({ items, window }: { items: Repo[]; window: string }) {
  const { settings, update } = useWatchlistSettings();
  const { rising } = useWatchlistAlerts(items, window, settings);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const enableAlerts = async () => {
    if (typeof Notification === "undefined") {
      toast.show("Browser notifications are not available here.");
      return;
    }
    setBusy(true);
    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        toast.show("Notifications are still off. You can enable them in browser settings.");
        return;
      }
      update({ alertsEnabled: true });
      toast.show("Watchlist alerts enabled.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-3.5">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <BellIcon size={17} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0">
          <div className="eyebrow !text-[9px]">Watchlist pulse</div>
          <p className="text-xs text-muted mt-0.5">
            {rising.length > 0
              ? `${rising.length} repo${rising.length === 1 ? " is" : "s are"} above your alert threshold.`
              : "Get notified when watched repos accelerate."}
          </p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-muted">
        <span>Alert at</span>
        <input
          type="number"
          min={1}
          value={settings.alertThreshold}
          onChange={(event) => update({ alertThreshold: Math.max(1, Number(event.target.value) || 1) })}
          className="input !w-16 !px-2 !py-1.5 text-center text-xs"
          aria-label="Watchlist alert threshold"
        />
        <span>stars / {window}</span>
      </label>
      <label className="flex items-center gap-2 text-[11px] text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={settings.digestEnabled}
          onChange={(event) => update({ digestEnabled: event.target.checked })}
          className="accent-primary"
        />
        Daily pulse
      </label>
      {settings.alertsEnabled ? (
        <button
          type="button"
          onClick={() => update({ alertsEnabled: false })}
          className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent"
        >
          Alerts on
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void enableAlerts()}
          className="btn-primary px-3 py-2 text-xs"
        >
          {busy ? "Enabling…" : "Enable alerts"}
        </button>
      )}
      {settings.digestEnabled && rising.length > 0 && (
        <p className="basis-full border-t border-border pt-2 text-[11px] text-muted">
          Pulse summary: {rising.slice(0, 3).map((repo) => `${repo.fullName} +${repo.starDelta?.toLocaleString()}`).join(" · ")}
          {rising.length > 3 ? ` · +${rising.length - 3} more` : ""}
        </p>
      )}
    </div>
  );
}
