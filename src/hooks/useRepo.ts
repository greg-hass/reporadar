import { useQuery } from "@tanstack/react-query";
import { fetchRepo } from "../lib/api";

export function useRepo(owner: string, name: string) {
  return useQuery({
    queryKey: ["repo", owner, name],
    queryFn: () => fetchRepo(owner, name),
  });
}
