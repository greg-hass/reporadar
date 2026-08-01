import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Repo } from "../lib/types";
import Sparkline from "./Sparkline";
import LanguageDot from "./LanguageDot";
import Rank from "./Rank";
import FavButton from "./FavButton";
import { ExternalLinkIcon } from "./icons";
import { safeExternalUrl } from "../lib/format";
import CompareButton from "./CompareButton";

interface Props {
  repo: Repo;
  rank: number; // 1-based
  /** riser window in days — used for the per-day velocity figure */
  windowDays: number;
  window: string; // "1d" | "7d" | "30d", shown next to the total delta
  selected: boolean;
  stagger: number;
}

/** Leaderboard row for Fast Risers: identity + trajectory + velocity hero. */
export default function RiserRow({ repo, rank, windowDays, window, selected, stagger }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const detailUrl = `/repo/${repo.fullName}`;
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const delta = repo.starDelta ?? 0;
  const perDay = Math.round(delta / windowDays);
  const history = repo.history ?? null;

  return (
    <div
      ref={ref}
      onClick={() => navigate(detailUrl)}
      className={`panel panel-row panel-row-rich cursor-pointer ${selected ? "panel-row-selected" : ""} animate-fade-up`}
      style={{ animationDelay: `${Math.min(stagger, 12) * 40}ms` }}
    >
      <Rank n={rank} />

      <img
        src={repo.ownerAvatar}
        alt=""
        className="w-11 h-11 rounded-xl ring-1 ring-border shrink-0"
        loading="lazy"
      />

      <div className="flex-1 min-w-0">
        <span className="flex items-start gap-1.5 min-w-0">
          <Link
            to={detailUrl}
            onClick={(e) => e.stopPropagation()}
            className="repo-name-rich min-w-0 line-clamp-2 font-semibold text-base leading-snug text-text hover:text-primary transition-colors"
          >
            {repo.fullName}
          </Link>
          <FavButton repo={repo} size={13} />
          <CompareButton repo={repo} />
          <a
            href={safeExternalUrl(repo.htmlUrl, repo.fullName)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Open ${repo.fullName} on GitHub`}
            title="Open on GitHub"
            className="shrink-0 text-muted/50 hover:text-text transition-colors"
          >
            <ExternalLinkIcon size={13} />
          </a>
        </span>
        {repo.description && (
          <p className="repo-description-rich text-muted text-[13px] leading-relaxed mt-1.5">{repo.description}</p>
        )}
        <span className="flex items-center text-xs text-muted mt-1.5">
          <LanguageDot language={repo.language} />
          {repo.language ?? "—"}
        </span>
      </div>

      <div className="hidden md:block text-right shrink-0">
        <div className="font-mono tabular-nums text-sm">{repo.starsTotal.toLocaleString()}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted">stars</div>
      </div>

      {history && history.length > 1 && (
        <div className="hidden lg:block shrink-0">
          <Sparkline points={history} width={150} height={44} endDot />
        </div>
      )}

      <div className="text-right shrink-0 pl-1 sm:pl-3">
        <div className="font-mono tabular-nums text-lg sm:text-2xl font-bold text-success leading-none">
          +{perDay.toLocaleString()}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-muted mt-1">stars / day</div>
        <div className="font-mono tabular-nums text-[10px] text-muted mt-1">
          +{delta.toLocaleString()} · {window}
        </div>
        {history && history.length > 1 && (
          <div className="hidden sm:block text-[9px] uppercase tracking-wider text-muted mt-1">
            {history.length} snapshots
          </div>
        )}
      </div>
    </div>
  );
}
