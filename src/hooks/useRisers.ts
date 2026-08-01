import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchRisers } from "../lib/api";
import type { Repo } from "../lib/types";

// Keep a guard against a malformed total causing an endless request loop.
// The API normally returns at most 50 rows per page and GitHub Search itself
// caps pagination at 1,000 results.
const MAX_PAGES = 20;

type RisersPage = { items: Repo[]; total: number };

export function getNextRisersPage(lastPage: RisersPage, allPages: RisersPage[]): number | undefined {
  const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
  return loaded < lastPage.total && allPages.length < MAX_PAGES ? allPages.length + 1 : undefined;
}

export function useRisers(window: "1d" | "7d" | "30d") {
  return useInfiniteQuery({
    queryKey: ["risers", window],
    queryFn: ({ pageParam }) => fetchRisers(window, pageParam),
    initialPageParam: 1,
    getNextPageParam: getNextRisersPage,
  });
}
