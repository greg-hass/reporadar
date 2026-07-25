import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFavourite, fetchFavouriteIds, fetchFavourites, putFavourite } from "../lib/api";
import type { Repo } from "../lib/types";

type Window = "1d" | "7d" | "30d";

export function useFavouriteIds() {
  return useQuery({ queryKey: ["favourite-ids"], queryFn: fetchFavouriteIds });
}

export function useFavourites(window: Window) {
  return useQuery({
    queryKey: ["favourites", window],
    queryFn: () => fetchFavourites(window),
  });
}

export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ repo, fav }: { repo: Repo; fav: boolean }) =>
      fav ? deleteFavourite(repo.id) : putFavourite(repo),
    onMutate: async ({ repo, fav }) => {
      await qc.cancelQueries({ queryKey: ["favourite-ids"] });
      const prev = qc.getQueryData<{ ids: number[] }>(["favourite-ids"]);
      qc.setQueryData(["favourite-ids"], {
        ids: fav
          ? (prev?.ids ?? []).filter((i) => i !== repo.id)
          : [...(prev?.ids ?? []), repo.id],
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favourite-ids"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favourite-ids"] });
      qc.invalidateQueries({ queryKey: ["favourites"] });
    },
  });
}
