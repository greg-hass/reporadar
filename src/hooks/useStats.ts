import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "../lib/api";

/** Dashboard counters for the stats band; refetches every minute to feel live. */
export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60_000,
  });
}
