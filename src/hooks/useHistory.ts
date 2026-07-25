import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "../lib/api";

export function useHistory(id: number | undefined, days: number) {
  return useQuery({
    queryKey: ["history", id, days],
    queryFn: () => fetchHistory(id!, days),
    enabled: id !== undefined,
  });
}
