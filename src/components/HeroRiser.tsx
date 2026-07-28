import { Link } from "react-router-dom";
import Sparkline from "./Sparkline";
import LanguageDot from "./LanguageDot";
import type { Repo } from "../lib/types";

/** Spotlight panel for the #1 riser at the top of the Trending homepage. */
export default function HeroRiser({ repo, windowDays }: { repo: Repo; windowDays: number }) {
  const delta = repo.starDelta ?? 0;
  const perDay = Math.round(delta / windowDays);
  const history = repo.history ?? null;
  return (
    <Link
      to={`/repo/${repo.fullName}`}
      className="panel block p-5 sm:p-6 hover:border-primary/40 animate-fade-up"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow !text-[9px] gradient-text">#1 riser · last {windowDays}d</span>
        <span className="flex items-center text-[11px] text-muted">
          <LanguageDot language={repo.language} />
          {repo.language ?? "—"}
        </span>
      </div>
      <div className="flex items-center gap-3.5 mt-4">
        <img src={repo.ownerAvatar} alt="" className="w-11 h-11 rounded-xl ring-1 ring-border" loading="lazy" />
        <div className="min-w-0">
          <div className="font-bold text-lg truncate">{repo.fullName}</div>
          {repo.description && (
            <p className="text-muted text-xs truncate mt-0.5">{repo.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 mt-5">
        <div>
          <div className="gradient-text font-mono tabular-nums text-4xl font-extrabold leading-none">
            +{perDay.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted mt-1.5">
            stars / day · +{delta.toLocaleString()} in {windowDays}d
          </div>
        </div>
        {history && history.length > 1 && (
          <div className="hidden sm:block shrink-0">
            <Sparkline points={history} width={220} height={56} endDot />
          </div>
        )}
      </div>
    </Link>
  );
}
