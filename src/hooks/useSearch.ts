import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSearch } from "../lib/api";
import type { SearchParams } from "../lib/types";

// GitHub Search caps at 1,000 results (per_page=30 → 34 pages max).
const MAX_PAGES = 34;

export function useSearch(params: Omit<SearchParams, "page">, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["search", params],
    queryFn: ({ pageParam }) => fetchSearch({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < 30 || allPages.length >= MAX_PAGES ? undefined : allPages.length + 1,
    enabled,
  });
}
