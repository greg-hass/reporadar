import { useQuery } from "@tanstack/react-query";
import { fetchReadme } from "../lib/api";

export function useReadme(owner: string, name: string) {
  return useQuery({
    queryKey: ["readme", owner, name],
    queryFn: () => fetchReadme(owner, name),
    staleTime: 5 * 60_000,
  });
}
