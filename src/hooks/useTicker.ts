import { useEffect, useState } from "react";

/**
 * Forces a re-render every `intervalMs` so relative-time labels
 * ("3 min ago") keep ticking between data refetches.
 * Returns a tick counter; consumers ignore the value.
 */
export function useTicker(intervalMs = 30_000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return tick;
}
