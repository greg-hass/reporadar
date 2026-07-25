import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchRisers } from "../lib/api";

export function useRisers(window: "1d" | "7d" | "30d") {
  return useInfiniteQuery({
    queryKey: ["risers", window],
    queryFn: ({ pageParam }) => fetchRisers(window, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < 30 ? undefined : allPages.length + 1,
  });
}
