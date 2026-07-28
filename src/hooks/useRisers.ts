import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchRisers } from "../lib/api";

// Server page size for /api/risers (server/index.ts).
const PAGE_SIZE = 50;

export function useRisers(window: "1d" | "7d" | "30d") {
  return useInfiniteQuery({
    queryKey: ["risers", window],
    queryFn: ({ pageParam }) => fetchRisers(window, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < PAGE_SIZE ? undefined : allPages.length + 1,
  });
}
