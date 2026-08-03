import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteFavourite,
  fetchFavouriteIds,
  fetchFavourites,
  putFavourite,
  updateFavourites,
} from "../lib/api";
import type { Repo, WatchlistPatch } from "../lib/types";
import { useToast } from "../components/Toast";

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

export function useUpdateWatchlist() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: number[]; patch: WatchlistPatch }) =>
      updateFavourites(ids, patch),
    onSuccess: (_result, { ids }) => {
      qc.invalidateQueries({ queryKey: ["favourites"] });
      toast.show(`${ids.length} watchlist item${ids.length === 1 ? "" : "s"} updated.`);
    },
    onError: () => {
      toast.show("Couldn't save those watchlist details. Try again.");
    },
  });
}

export function useToggleFavourite() {
  const qc = useQueryClient();
  const toast = useToast();
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
      toast.show("Couldn't update your watchlist. Try again.");
    },
    onSuccess: (_result, { repo, fav }) => {
      toast.show(
        fav
          ? `${repo.fullName} removed from your watchlist.`
          : `${repo.fullName} added. Tracking starts with the next snapshot.`,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favourite-ids"] });
      qc.invalidateQueries({ queryKey: ["favourites"] });
    },
  });
}
