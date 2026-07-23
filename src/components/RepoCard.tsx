import type { Repo } from "../lib/types";
import Sparkline from "./Sparkline";
import type { Density } from "../hooks/useDensity";

interface Props {
  repo: Repo;
  density: Density;
  deltaWindowLabel?: string;  // unit shown in the +N / <label> badge; defaults to "week"
}

function LanguageDot({ language }: { language: string | null }) {
  // minimal stable hash → hue so each language gets a consistent color
  let hash = 0;
  if (language) for (const c of language) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = language ? hash % 360 : 0;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
      style={{ backgroundColor: language ? `hsl(${hue} 60% 60%)` : "var(--color-muted)" }}
    />
  );
}

export default function RepoCard({ repo, density, deltaWindowLabel = "week" }: Props) {
  const delta = repo.starDelta ?? null;
  const history = repo.history ?? null;

  if (density === "compact") {
    return (
      <div className="flex items-center gap-3 border border-border rounded-lg bg-surface px-4 py-3">
        <img src={repo.ownerAvatar} alt="" className="w-6 h-6 rounded" />
        <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold text-sm truncate">
          {repo.fullName}
        </a>
        <span className="text-muted text-xs truncate hidden sm:block">{repo.description}</span>
        <span className="ml-auto text-xs">★ {repo.starsTotal.toLocaleString()}</span>
        {delta !== null && (
          <span className="text-success text-xs font-semibold">+{delta}</span>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-surface px-5 py-4">
      <div className="flex items-start gap-3">
        <img src={repo.ownerAvatar} alt="" className="w-7 h-7 rounded mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="text-primary font-bold">
              {repo.fullName}
            </a>
            {delta !== null && (
              <span className="ml-auto text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))" }}>
                +{delta} / {deltaWindowLabel}
              </span>
            )}
          </div>
          {repo.description && <p className="text-text/90 text-sm mt-1">{repo.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
            <span className="flex items-center"><LanguageDot language={repo.language} />{repo.language ?? "—"}</span>
            <span>★ {repo.starsTotal.toLocaleString()}</span>
            <span>⑂ {repo.forks.toLocaleString()}</span>
            {repo.license && <span>{repo.license}</span>}
            <span>created {new Date(repo.createdAt).toLocaleDateString()}</span>
          </div>
          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {repo.topics.slice(0, 6).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {history && history.length > 1 && (
          <div className="text-right shrink-0">
            <Sparkline points={history} />
            <div className="text-[9px] text-muted mt-1">7-day stars</div>
          </div>
        )}
      </div>
    </div>
  );
}
