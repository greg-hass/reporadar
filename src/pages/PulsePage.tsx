import { Link } from "react-router-dom";
import RepoRow from "../components/RepoRow";
import StatsBand from "../components/StatsBand";
import RepoListSkeleton from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import Sparkline from "../components/Sparkline";
import LanguageDot from "../components/LanguageDot";
import { useRisers } from "../hooks/useRisers";
import { useSearch } from "../hooks/useSearch";
import { relativeTime } from "../lib/format";
import type { Repo } from "../lib/types";

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2">
      <span className="eyebrow !text-[9px]">{title}</span>
      {to && (
        <Link to={to} className="text-[11px] text-muted hover:text-primary transition-colors">
          View all →
        </Link>
      )}
    </div>
  );
}

function HeroRiser({ repo }: { repo: Repo }) {
  const delta = repo.starDelta ?? 0;
  const perDay = Math.round(delta / 7);
  const history = repo.history ?? null;
  return (
    <a
      href={repo.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="panel block p-5 sm:p-6 hover:border-primary/40 animate-fade-up"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow !text-[9px] gradient-text">#1 riser · this week</span>
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
            stars / day · +{delta.toLocaleString()} this week
          </div>
        </div>
        {history && history.length > 1 && (
          <div className="hidden sm:block shrink-0">
            <Sparkline points={history} width={220} height={56} endDot />
          </div>
        )}
      </div>
    </a>
  );
}

export default function PulsePage() {
  const risers = useRisers("7d", 1);
  const fresh = useSearch({ q: "stars:>1", createdSinceDays: 7, sort: "updated" }, true);

  const hero = risers.data?.items[0];
  const topRisers = risers.data?.items.slice(1, 6) ?? [];
  const freshRepos = fresh.data?.items.slice(0, 6) ?? [];

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <div className="radar-bg" aria-hidden="true" />

      <div>
        <div className="eyebrow">Today on the radar</div>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">Pulse</h1>
      </div>

      <StatsBand />

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {risers.isLoading ? (
            <RepoListSkeleton count={3} />
          ) : risers.error ? (
            <ErrorState message={(risers.error as Error).message} onRetry={() => risers.refetch()} />
          ) : !hero ? (
            <EmptyState
              title="No signals yet"
              hint="The radar comes alive after the hourly snapshot job has run at least twice."
            />
          ) : (
            <>
              <HeroRiser repo={hero} />
              {topRisers.length > 0 && (
                <section>
                  <SectionHeader title="Top risers · 7d" to="/risers" />
                  <div className="flex flex-col gap-2.5">
                    {topRisers.map((repo, i) => (
                      <RepoRow
                        key={repo.id}
                        repo={repo}
                        rank={i + 2}
                        stagger={i}
                        compact
                        right={
                          <div className="text-right shrink-0">
                            <div className="font-mono tabular-nums text-sm font-bold text-success">
                              +{Math.round((repo.starDelta ?? 0) / 7).toLocaleString()}
                            </div>
                            <div className="text-[9px] uppercase tracking-wider text-muted">/ day</div>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <section>
          <SectionHeader title="Fresh signals" to="/new" />
          {fresh.isLoading ? (
            <RepoListSkeleton count={5} />
          ) : fresh.error ? (
            <p className="text-muted text-xs px-1">{(fresh.error as Error).message}</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {freshRepos.map((repo, i) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  stagger={i}
                  compact
                  right={
                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums text-[11px]">
                        {relativeTime(repo.createdAt)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-muted">created</div>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
