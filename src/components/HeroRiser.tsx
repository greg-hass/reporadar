import { Link } from "react-router-dom";
import Sparkline from "./Sparkline";
import LanguageDot from "./LanguageDot";
import { useCountUp } from "../hooks/useCountUp";
import type { Repo } from "../lib/types";

/** Spotlight panel for the #1 riser at the top of the Trending homepage. */
export default function HeroRiser({ repo, windowDays }: { repo: Repo; windowDays: number }) {
  const delta = repo.starDelta ?? 0;
  const perDay = useCountUp(Math.round(delta / windowDays));
  const history = repo.history ?? null;
  return (
    <Link
      to={`/repo/${repo.fullName}`}
      className="panel hero-glow block p-5 sm:p-6 animate-fade-up transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="hero-radar" aria-hidden="true" />
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
          <div className="repo-name-rich line-clamp-2 font-bold text-lg leading-snug">{repo.fullName}</div>
          {repo.description && (
            <p className="repo-description-rich text-muted text-[13px] leading-relaxed mt-1">{repo.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 mt-5">
        <div>
          <div className="gradient-text hero-number font-display tabular-nums text-6xl font-extrabold leading-none tracking-tight">
            +{perDay.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted mt-1.5">
            stars / day · +{delta.toLocaleString()} in {windowDays}d
          </div>
          <div className="text-[10px] text-muted mt-1">
            {history && history.length > 1 ? `${history.length} snapshots · tracking confidence` : "New signal · snapshotting now"}
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
