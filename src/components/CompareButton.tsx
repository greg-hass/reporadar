import type { Repo } from "../lib/types";
import { CheckIcon, CompareIcon } from "./icons";
import { useCompare } from "../hooks/useCompare";
import { useToast } from "./Toast";

export default function CompareButton({ repo, label = false }: { repo: Repo; label?: boolean }) {
  const { isSelected, toggle } = useCompare();
  const toast = useToast();
  const selected = isSelected(repo.id);

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const action = toggle(repo);
    if (action === "limit") toast.show("Compare up to three repos at a time.");
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={selected ? `Remove ${repo.fullName} from comparison` : `Compare ${repo.fullName}`}
      aria-pressed={selected}
      title={selected ? "Remove from comparison" : "Compare repository"}
      className={`flex shrink-0 items-center gap-1.5 transition-colors ${
        label
          ? `rounded-lg border px-3 py-2 text-xs font-semibold ${selected ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-text"}`
          : selected ? "text-accent" : "text-muted/50 hover:text-accent"
      }`}
    >
      {selected ? <CheckIcon size={label ? 14 : 13} /> : <CompareIcon size={label ? 14 : 13} />}
      {label && (selected ? "Comparing" : "Compare")}
    </button>
  );
}
