import { Link } from "react-router-dom";
import { XIcon } from "./icons";
import { useCompare } from "../hooks/useCompare";

export default function CompareBar() {
  const { repos, remove, clear } = useCompare();
  if (repos.length === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-[4.5rem] z-40 flex items-center gap-2 rounded-2xl border border-primary/40 bg-elevated/95 p-2.5 shadow-glow backdrop-blur md:inset-x-auto md:bottom-5 md:right-5 md:w-auto">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {repos.map((repo) => (
          <button
            key={repo.id}
            type="button"
            onClick={() => remove(repo.id)}
            className="flex min-w-0 items-center gap-1 rounded-lg bg-surface px-2 py-1.5 text-[11px] text-text"
            title={`Remove ${repo.fullName}`}
          >
            <span className="max-w-20 truncate">{repo.fullName.split("/").at(-1)}</span>
            <XIcon size={11} className="shrink-0 text-muted" />
          </button>
        ))}
      </div>
      <Link to="/compare" className="btn-primary shrink-0 px-3 py-2 text-xs">
        Compare {repos.length}
      </Link>
      <button type="button" onClick={clear} className="shrink-0 px-1 text-muted hover:text-text" aria-label="Clear comparison">
        ×
      </button>
    </div>
  );
}
