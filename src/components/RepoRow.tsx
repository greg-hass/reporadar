import type { ReactNode } from "react";
import type { Repo } from "../lib/types";
import { compactNumber } from "../lib/format";
import { ForkIcon, StarIcon } from "./icons";
import LanguageDot from "./LanguageDot";
import Rank from "./Rank";

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
  return (
    <div
      className={`panel panel-row ${selected ? "panel-row-selected" : ""} animate-fade-up`}
      style={{ animationDelay: `${Math.min(stagger, 12) * 40}ms` }}
    >
      {rank !== undefined && <Rank n={rank} />}
      <img
        src={repo.ownerAvatar}
        alt=""
        className="w-8 h-8 rounded-lg ring-1 ring-border shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <a
          href={repo.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[15px] text-text hover:text-primary transition-colors truncate block"
        >
          {repo.fullName}
        </a>
        {!compact && repo.description && (
          <p className="hidden sm:block text-muted text-xs truncate mt-0.5">{repo.description}</p>
        )}
        {!compact && (
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 mt-1 text-[11px] text-muted">
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
