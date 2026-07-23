import { useQuery } from "@tanstack/react-query";
import { fetchRisers } from "../lib/api";

export function useRisers(window: "1d" | "7d" | "30d", page: number) {
  return useQuery({
    queryKey: ["risers", window, page],
    queryFn: () => fetchRisers(window, page),
  });
}
