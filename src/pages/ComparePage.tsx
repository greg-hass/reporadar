import { Link } from "react-router-dom";
import { useCompare } from "../hooks/useCompare";
import { compactNumber, relativeTime, safeExternalUrl } from "../lib/format";
import { ExternalLinkIcon, StarIcon } from "../components/icons";
import CompareButton from "../components/CompareButton";
import { buildCompareSummary } from "../lib/compare";
import type { Repo } from "../lib/types";

type MetricKey = "momentum" | "evidence" | "stars" | "language" | "forks" | "activity" | "license" | "topics" | "created";

type MetricFormatter = (repo: Repo) => string;

const METRIC_FORMATTERS: Record<MetricKey, MetricFormatter> = {
  momentum: (repo) => {
    if (repo.starDelta === null || repo.starDelta === undefined) return "No tracked trend";
    return `${repo.starDelta >= 0 ? "+" : ""}${repo.starDelta.toLocaleString()} stars`;
  },
  evidence: (repo) => {
    const count = repo.history?.length ?? 0;
    return `${count} snapshot${count === 1 ? "" : "s"}`;
  },
  stars: (repo) => compactNumber(repo.starsTotal),
  language: (repo) => repo.language ?? "—",
  forks: (repo) => compactNumber(repo.forks),
  activity: (repo) => relativeTime(repo.pushedAt),
  license: (repo) => repo.license ?? "—",
  topics: (repo) => repo.topics.length ? repo.topics.slice(0, 4).join(", ") : "—",
  created: (repo) => new Date(repo.createdAt).toLocaleDateString(),
};

function value(repo: Repo, key: MetricKey): string {
  return METRIC_FORMATTERS[key](repo);
}

export default function ComparePage() {
  const { repos } = useCompare();
  const summary = buildCompareSummary(repos);
  const fields: ReadonlyArray<readonly [string, MetricKey]> = [
    ["Momentum", "momentum"],
    ["Evidence", "evidence"],
    ["Stars", "stars"],
    ["Language", "language"],
    ["Forks", "forks"],
    ["Last pushed", "activity"],
    ["License", "license"],
    ["Topics", "topics"],
    ["Created", "created"],
  ];

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
        <>
          <section className="panel p-4 sm:p-5" aria-labelledby="comparison-brief-heading">
            <div className="eyebrow">Decision brief</div>
            <h2 id="comparison-brief-heading" className="mt-1 text-sm font-semibold">What the evidence says</h2>
            <p className="mt-2 text-sm text-text">{summary.headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{summary.evidence}</p>
          </section>
          <div className="panel overflow-x-auto">
            <div className="min-w-[620px] p-4 sm:p-6">
            <div className="grid gap-3" style={{ gridTemplateColumns: `120px repeat(${repos.length}, minmax(0, 1fr))` }}>
              <div />
              {repos.map((repo) => (
                <div key={repo.id} className="min-w-0">
                  <img src={repo.ownerAvatar} alt="" className="h-12 w-12 rounded-xl ring-1 ring-border" />
                  <Link to={`/repo/${repo.fullName}`} className="mt-2 block truncate text-sm font-semibold hover:text-primary">{repo.fullName}</Link>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {repo.description ?? "No description provided."}
                  </p>
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
        </>
      )}
    </div>
  );
}
