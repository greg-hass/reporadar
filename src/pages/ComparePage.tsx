import { Link } from "react-router-dom";
import { useCompare } from "../hooks/useCompare";
import { compactNumber, safeExternalUrl } from "../lib/format";
import { ExternalLinkIcon, StarIcon } from "../components/icons";
import CompareButton from "../components/CompareButton";

function value(repo: ReturnType<typeof useCompare>["repos"][number], key: string) {
  switch (key) {
    case "momentum": return repo.starDelta == null ? "Not tracked yet" : `+${repo.starDelta.toLocaleString()} stars`;
    case "stars": return compactNumber(repo.starsTotal);
    case "language": return repo.language ?? "—";
    case "forks": return compactNumber(repo.forks);
    case "license": return repo.license ?? "—";
    case "created": return new Date(repo.createdAt).toLocaleDateString();
    default: return "—";
  }
}

export default function ComparePage() {
  const { repos } = useCompare();
  const fields = [
    ["Momentum", "momentum"],
    ["Stars", "stars"],
    ["Language", "language"],
    ["Forks", "forks"],
    ["License", "license"],
    ["Created", "created"],
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Link to="/" className="self-start rounded-full bg-surface/80 px-3.5 py-1.5 text-xs text-muted hover:text-text">← Back to discovery</Link>
      <div>
        <div className="eyebrow">Decision desk</div>
        <h1 className="font-display mt-1 text-2xl font-extrabold tracking-tight">Compare repositories</h1>
        <p className="mt-1 text-xs text-muted">Put up to three candidates side by side before you choose what to explore.</p>
      </div>
      {repos.length < 2 ? (
        <div className="panel flex flex-col items-center px-5 py-16 text-center">
          <StarIcon size={24} className="text-primary" />
          <h2 className="mt-4 text-[15px] font-semibold">Choose two repositories to compare</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">Use the compare icon on a riser, search result, or repository detail page.</p>
          <Link to="/" className="btn-primary mt-5 px-4 py-2 text-sm">Browse risers</Link>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <div className="min-w-[620px] p-4 sm:p-6">
            <div className="grid gap-3" style={{ gridTemplateColumns: `120px repeat(${repos.length}, minmax(0, 1fr))` }}>
              <div />
              {repos.map((repo) => (
                <div key={repo.id} className="min-w-0">
                  <img src={repo.ownerAvatar} alt="" className="h-12 w-12 rounded-xl ring-1 ring-border" />
                  <Link to={`/repo/${repo.fullName}`} className="mt-2 block truncate text-sm font-semibold hover:text-primary">{repo.fullName}</Link>
                  <div className="mt-2 flex items-center gap-2">
                    <CompareButton repo={repo} />
                    <a href={safeExternalUrl(repo.htmlUrl, repo.fullName)} target="_blank" rel="noreferrer" className="text-muted hover:text-text" aria-label={`Open ${repo.fullName} on GitHub`}><ExternalLinkIcon size={13} /></a>
                  </div>
                </div>
              ))}
              {fields.flatMap(([label, key]) => [
                <div key={`${key}-label`} className="border-t border-border pt-3 text-[11px] uppercase tracking-wider text-muted">{label}</div>,
                ...repos.map((repo) => (
                  <div key={`${repo.id}-${key}`} className="border-t border-border pt-3 text-sm text-text">{value(repo, key)}</div>
                )),
              ])}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
