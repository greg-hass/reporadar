import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HistoryChart from "../components/HistoryChart";
import SegmentedControl from "../components/SegmentedControl";
import LanguageDot from "../components/LanguageDot";
import { ErrorState } from "../components/States";
import { ExternalLinkIcon, ForkIcon, StarIcon } from "../components/icons";
import { useRepo } from "../hooks/useRepo";
import { useHistory } from "../hooks/useHistory";
import { useFavouriteIds, useToggleFavourite } from "../hooks/useFavourites";
import { compactNumber } from "../lib/format";

type Days = "7" | "30" | "90";
const DAYS_OPTIONS: { value: Days; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export default function RepoDetailPage() {
  const { owner = "", name = "" } = useParams();
  const navigate = useNavigate();
  const [days, setDays] = useState<Days>("30");
  const { data: repo, isLoading, error, refetch } = useRepo(owner, name);
  const history = useHistory(repo?.id, Number(days));
  const { data: favIds } = useFavouriteIds();
  const toggle = useToggleFavourite();

  const points = history.data?.points ?? [];
  const tracked = points.length > 1;
  const isFav = repo ? (favIds?.ids.includes(repo.id) ?? false) : false;

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="self-start text-xs text-muted hover:text-text transition-colors"
      >
        ← Back
      </button>

      {isLoading ? (
        <div className="panel p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="skeleton w-14 h-14 !rounded-xl" />
            <div className="flex-1">
              <div className="skeleton h-5 w-56" />
              <div className="skeleton h-3 w-full max-w-md mt-2.5" />
            </div>
          </div>
          <div className="skeleton h-40 w-full mt-6" />
        </div>
      ) : error || !repo ? (
        <ErrorState
          message={error ? (error as Error).message : "Repository not found."}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="panel p-5 sm:p-6 animate-fade-up">
            <div className="flex flex-wrap items-start gap-4">
              <img src={repo.ownerAvatar} alt="" className="w-14 h-14 rounded-xl ring-1 ring-border" />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight break-all">{repo.fullName}</h1>
                {repo.description && (
                  <p className="text-muted text-sm mt-1 leading-relaxed">{repo.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggle.mutate({ repo, fav: isFav })}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    isFav
                      ? "border-accent/50 text-accent bg-accent/10"
                      : "border-border text-muted hover:text-text hover:border-primary/50"
                  }`}
                >
                  <StarIcon size={14} fill={isFav ? "currentColor" : "none"} />
                  {isFav ? "Favourited" : "Favourite"}
                </button>
                <a
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs"
                >
                  <ExternalLinkIcon size={13} />
                  Open on GitHub
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-muted">
              <span className="flex items-center">
                <LanguageDot language={repo.language} />
                {repo.language ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <StarIcon size={12} />
                {repo.starsTotal.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <ForkIcon size={12} />
                {compactNumber(repo.forks)}
              </span>
              {repo.license && <span>{repo.license}</span>}
              <span>created {new Date(repo.createdAt).toLocaleDateString()}</span>
            </div>

            {repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {repo.topics.slice(0, 8).map((t) => (
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

          <div className="panel p-5 sm:p-6 animate-fade-up">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow !text-[9px]">Star history</span>
              <div className="ml-auto">
                <SegmentedControl value={days} options={DAYS_OPTIONS} onChange={setDays} ariaLabel="History window" />
              </div>
            </div>
            <div className="mt-4">
              {history.isLoading ? (
                <div className="skeleton h-44 w-full" />
              ) : tracked ? (
                <HistoryChart points={points} />
              ) : (
                <div className="flex flex-col items-center text-center py-10">
                  <p className="text-muted text-sm max-w-sm">
                    This repo isn't tracked yet. Favourite it and the hourly job will start
                    snapshotting its stars — the chart appears after two snapshots.
                  </p>
                  {!isFav && (
                    <button
                      onClick={() => toggle.mutate({ repo, fav: false })}
                      className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs mt-4"
                    >
                      <StarIcon size={13} />
                      Favourite to track
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
