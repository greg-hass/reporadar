import { StarIcon } from "./icons";
import { useFavouriteIds, useToggleFavourite } from "../hooks/useFavourites";
import type { Repo } from "../lib/types";

/** Star toggle; favourited repos are snapshotted hourly by the tracking job. */
export default function FavButton({ repo, size = 15 }: { repo: Repo; size?: number }) {
  const { data } = useFavouriteIds();
  const toggle = useToggleFavourite();
  const fav = data?.ids.includes(repo.id) ?? false;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle.mutate({ repo, fav });
      }}
      aria-label={fav ? `Remove ${repo.fullName} from favourites` : `Add ${repo.fullName} to favourites`}
      aria-pressed={fav}
      title={fav ? "Remove from favourites" : "Favourite — tracked hourly"}
      className={`shrink-0 transition-colors ${fav ? "text-accent" : "text-muted/50 hover:text-accent"}`}
    >
      <StarIcon size={size} fill={fav ? "currentColor" : "none"} />
    </button>
  );
}
