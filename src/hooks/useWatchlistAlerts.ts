import { useEffect, useMemo, useState } from "react";
import type { Repo } from "../lib/types";

export interface WatchlistSettings {
	telegramEnabled: boolean;
	alertThreshold: number;
	digestEnabled: boolean;
}

const STORAGE_KEY = "reporadar-watchlist-settings";
type StoredWatchlistSettings = Partial<WatchlistSettings> & {
	alertsEnabled?: boolean;
};
const DEFAULTS: WatchlistSettings = {
	telegramEnabled: false,
	alertThreshold: 50,
	digestEnabled: true,
};

function loadSettings(): WatchlistSettings {
	try {
		const parsed = JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? "null",
		) as StoredWatchlistSettings | null;
		return {
			telegramEnabled:
				parsed?.telegramEnabled === true || parsed?.alertsEnabled === true,
			alertThreshold: Number.isFinite(parsed?.alertThreshold)
				? Math.max(1, Number(parsed?.alertThreshold))
				: DEFAULTS.alertThreshold,
			digestEnabled: parsed?.digestEnabled !== false,
		};
	} catch {
		return DEFAULTS;
	}
}

export function useWatchlistSettings() {
	const [settings, setSettings] = useState<WatchlistSettings>(() =>
		loadSettings(),
	);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	}, [settings]);

	return {
		settings,
		update: (patch: Partial<WatchlistSettings>) =>
			setSettings((current) => ({ ...current, ...patch })),
	};
}

export function useWatchlistAlerts(items: Repo[], settings: WatchlistSettings) {
	const rising = useMemo(
		() =>
			items.filter((repo) => (repo.starDelta ?? 0) >= settings.alertThreshold),
		[items, settings.alertThreshold],
	);

	return { rising };
}
