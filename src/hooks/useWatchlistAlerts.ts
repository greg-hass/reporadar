import { useEffect, useMemo, useState } from "react";
import type { Repo } from "../lib/types";

export interface WatchlistSettings {
  alertsEnabled: boolean;
  alertThreshold: number;
  digestEnabled: boolean;
}

const STORAGE_KEY = "reporadar-watchlist-settings";
const ALERTS_SEEN_KEY = "reporadar-watchlist-alerts-seen";
const DEFAULTS: WatchlistSettings = {
  alertsEnabled: false,
  alertThreshold: 50,
  digestEnabled: true,
};

function loadSettings(): WatchlistSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<WatchlistSettings> | null;
    return {
      alertsEnabled: parsed?.alertsEnabled === true,
      alertThreshold: Number.isFinite(parsed?.alertThreshold) ? Math.max(1, Number(parsed?.alertThreshold)) : DEFAULTS.alertThreshold,
      digestEnabled: parsed?.digestEnabled !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useWatchlistSettings() {
  const [settings, setSettings] = useState<WatchlistSettings>(() => loadSettings());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return {
    settings,
    update: (patch: Partial<WatchlistSettings>) => setSettings((current) => ({ ...current, ...patch })),
  };
}

export function useWatchlistAlerts(items: Repo[], window: string, settings: WatchlistSettings) {
  const rising = useMemo(
    () => items.filter((repo) => (repo.starDelta ?? 0) >= settings.alertThreshold),
    [items, settings.alertThreshold],
  );

  useEffect(() => {
    if (!settings.alertsEnabled || rising.length === 0) return;

    let seen: Record<string, string> = {};
    try {
      seen = JSON.parse(localStorage.getItem(ALERTS_SEEN_KEY) ?? "{}") as Record<string, string>;
    } catch {
      seen = {};
    }

    const fresh = rising.filter((repo) => {
      const signature = `${window}:${repo.id}:${repo.starDelta}`;
      return seen[String(repo.id)] !== signature;
    });
    if (fresh.length === 0) return;

    for (const repo of fresh) {
      seen[String(repo.id)] = `${window}:${repo.id}:${repo.starDelta}`;
    }
    localStorage.setItem(ALERTS_SEEN_KEY, JSON.stringify(seen));

    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const message = fresh.length === 1
      ? `${fresh[0].fullName} gained ${fresh[0].starDelta?.toLocaleString()} stars in ${window}.`
      : `${fresh.length} watchlist repos crossed your ${settings.alertThreshold.toLocaleString()}-star alert threshold.`;
    void navigator.serviceWorker?.ready.then((registration) => {
      void registration.showNotification("RepoRadar pulse", {
        body: message,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "reporadar-watchlist-pulse",
      });
    });
  }, [rising, settings.alertsEnabled, settings.alertThreshold, window]);

  return { rising };
}
