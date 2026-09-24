import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSearch } from "../lib/api";
import type { SearchParams } from "../lib/types";

// GitHub Search caps at 1,000 results (per_page=30 → 34 pages max).
const MAX_PAGES = 34;

export function useSearch(params: Omit<SearchParams, "page">, enabled: boolean) {
  const paramsKey = JSON.stringify(params);
  const [settledKey, setSettledKey] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledKey(paramsKey), 350);
    return () => window.clearTimeout(timer);
  }, [paramsKey]);
  const settling = settledKey !== paramsKey;

  const query = useInfiniteQuery({
    queryKey: ["search", paramsKey],
    queryFn: ({ pageParam }) => fetchSearch({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < 30 || allPages.length >= MAX_PAGES ? undefined : allPages.length + 1,
    enabled: enabled && !settling,
  });
  return { ...query, isLoading: query.isLoading || (enabled && settling) };
}
