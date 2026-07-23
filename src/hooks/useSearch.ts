import { useQuery } from "@tanstack/react-query";
import { fetchSearch } from "../lib/api";
import type { SearchParams } from "../lib/types";

export function useSearch(params: SearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: () => fetchSearch(params),
    enabled,
  });
}
