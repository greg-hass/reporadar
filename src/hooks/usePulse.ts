import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPulse } from "../lib/api.js";

const STORAGE_KEY = "reporadar-pulse-last-seen";
const FIRST_LOOKBACK_DAYS = 7;

interface SeenState {
	since: string;
	hasSeen: boolean;
}

function readSeenState(): SeenState {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && Number.isFinite(Date.parse(stored))) {
			return { since: new Date(stored).toISOString(), hasSeen: true };
		}
	} catch {
		// Treat storage failures as a first visit; Pulse still works server-side.
	}
	return {
		since: new Date(
			Date.now() - FIRST_LOOKBACK_DAYS * 86_400_000,
		).toISOString(),
		hasSeen: false,
	};
}

export function usePulse() {
	const [seenState, setSeenState] = useState<SeenState>(() => readSeenState());
	const query = useQuery({
		queryKey: ["pulse", seenState.since],
		queryFn: () => fetchPulse(seenState.since),
		refetchInterval: 60_000,
	});

	const markSeen = useCallback(() => {
		const seenAt = query.data?.generatedAt ?? new Date().toISOString();
		try {
			localStorage.setItem(STORAGE_KEY, seenAt);
		} catch {
			// The in-memory state still keeps this visit consistent.
		}
		setSeenState({ since: seenAt, hasSeen: true });
	}, [query.data?.generatedAt]);

	return {
		...query,
		hasSeen: seenState.hasSeen,
		since: seenState.since,
		markSeen,
	};
}
