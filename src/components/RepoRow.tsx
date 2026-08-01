import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Repo } from "../lib/types";
import { compactNumber, safeExternalUrl } from "../lib/format";
import { ExternalLinkIcon, ForkIcon, StarIcon } from "./icons";
import LanguageDot from "./LanguageDot";
import Rank from "./Rank";
import FavButton from "./FavButton";
import CompareButton from "./CompareButton";

interface Props {
  repo: Repo;
  /** 1-based leaderboard position; omit to hide the numeral */
  rank?: number;
  selected?: boolean;
  /** tighter row: hides description and meta line */
  compact?: boolean;
  stagger?: number;
  /** right-hand block (stars, age, sparkline…) */
  right?: ReactNode;
}

/** The one row used by every list in the app — a standalone panel card. */
export default function RepoRow({ repo, rank, selected, compact, stagger = 0, right }: Props) {
  const navigate = useNavigate();
  const detailUrl = `/repo/${repo.fullName}`;
  const rich = !compact;

  return (
    <div
      onClick={() => navigate(detailUrl)}
      className={`panel panel-row ${rich ? "panel-row-rich" : ""} cursor-pointer ${selected ? "panel-row-selected" : ""} animate-fade-up`}
      style={{ animationDelay: `${Math.min(stagger, 12) * 40}ms` }}
    >
      {rank !== undefined && <Rank n={rank} />}
      <img
        src={repo.ownerAvatar}
        alt=""
        className={`${rich ? "w-11 h-11 rounded-xl" : "w-8 h-8 rounded-lg"} ring-1 ring-border shrink-0`}
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <span className={`flex gap-1.5 min-w-0 ${rich ? "items-start" : "items-center"}`}>
          <Link
            to={detailUrl}
            onClick={(e) => e.stopPropagation()}
            className={`min-w-0 font-semibold text-text hover:text-primary transition-colors ${
              rich
                ? "repo-name-rich line-clamp-2 text-base leading-snug"
                : "truncate text-[15px]"
            }`}
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
        {!compact && repo.description && (
          <p className="repo-description-rich text-muted text-[13px] leading-relaxed mt-1.5">{repo.description}</p>
        )}
        {!compact && (
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 mt-1.5 text-xs text-muted">
            <span className="flex items-center">
              <LanguageDot language={repo.language} />
              {repo.language ?? "—"}
            </span>
            <span className="flex items-center gap-1">
              <StarIcon size={11} />
              {compactNumber(repo.starsTotal)}
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <ForkIcon size={11} />
              {compactNumber(repo.forks)}
            </span>
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
