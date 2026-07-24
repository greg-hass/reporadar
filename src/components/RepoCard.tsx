import type { Repo } from "../lib/types";
import { compactNumber } from "../lib/format";
import Sparkline from "./Sparkline";
import { ExternalLinkIcon, ForkIcon, StarIcon } from "./icons";
import type { Density } from "../hooks/useDensity";

interface Props {
  repo: Repo;
  density: Density;
  /** unit shown in the +N / <label> badge; defaults to "week" */
  deltaWindowLabel?: string;
  /** index used to stagger the entrance animation */
  stagger?: number;
}

function LanguageDot({ language }: { language: string | null }) {
  // minimal stable hash → hue so each language gets a consistent color
  let hash = 0;
  if (language) for (const c of language) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = language ? hash % 360 : 0;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shrink-0"
      style={{ backgroundColor: language ? `hsl(${hue} 60% 60%)` : "var(--color-muted)" }}
    />
  );
}

export default function RepoCard({ repo, density, deltaWindowLabel = "week", stagger = 0 }: Props) {
  const delta = repo.starDelta ?? null;
  const history = repo.history ?? null;
  const animStyle = { animationDelay: `${Math.min(stagger, 12) * 40}ms` };

  if (density === "compact") {
    return (
      <div
        className="card flex items-center gap-3 px-4 min-h-[46px] py-2 hover:border-primary/50 animate-fade-up"
        style={animStyle}
      >
        <img src={repo.ownerAvatar} alt="" className="w-6 h-6 rounded-md shrink-0" loading="lazy" />
        <a
          href={repo.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary font-semibold text-sm truncate hover:underline"
        >
          {repo.fullName}
        </a>
        <span className="text-muted text-xs truncate hidden md:block">{repo.description}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted shrink-0">
          <StarIcon size={12} />
          {compactNumber(repo.starsTotal)}
        </span>
        {delta !== null && (
          <span className="text-success text-xs font-semibold shrink-0">+{compactNumber(delta)}</span>
        )}
      </div>
    );
  }

  return (
    <article
      className="card group p-4 sm:p-5 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card animate-fade-up"
      style={animStyle}
    >
      <div className="flex items-start gap-3.5">
        <img
          src={repo.ownerAvatar}
          alt=""
          className="w-9 h-9 rounded-lg ring-1 ring-border shrink-0 mt-0.5"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[15px] text-text hover:text-primary transition-colors truncate"
            >
              {repo.fullName}
              <ExternalLinkIcon
                size={12}
                className="inline-block ml-1.5 -mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity"
              />
            </a>
            {delta !== null && (
              <span
                className="ml-auto flex items-center gap-1 text-[10px] font-bold text-white pl-1.5 pr-2.5 py-1 rounded-full shrink-0"
                style={{
                  background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
                }}
              >
                <StarIcon size={10} />
                +{compactNumber(delta)} / {deltaWindowLabel}
              </span>
            )}
          </div>
          {repo.description && (
            <p className="text-text/85 text-sm mt-1.5 leading-relaxed">{repo.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-muted">
            <span className="flex items-center">
              <LanguageDot language={repo.language} />
              {repo.language ?? "—"}
            </span>
            <span className="flex items-center gap-1">
              <StarIcon size={12} />
              {compactNumber(repo.starsTotal)}
            </span>
            <span className="flex items-center gap-1">
              <ForkIcon size={12} />
              {compactNumber(repo.forks)}
            </span>
            {repo.license && <span>{repo.license}</span>}
            <span className="hidden sm:inline">
              created {new Date(repo.createdAt).toLocaleDateString()}
            </span>
          </div>
          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {repo.topics.slice(0, 6).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-elevated border border-border/60 text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {history && history.length > 1 && (
          <div className="text-right shrink-0 hidden sm:block">
            <Sparkline points={history} />
            <div className="text-[9px] text-muted mt-1">7-day stars</div>
          </div>
        )}
      </div>
    </article>
  );
}
