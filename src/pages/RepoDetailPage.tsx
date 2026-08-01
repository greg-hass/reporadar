import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import HistoryChart from "../components/HistoryChart";
import SegmentedControl from "../components/SegmentedControl";
import LanguageDot from "../components/LanguageDot";
import { ErrorState } from "../components/States";
import { ExternalLinkIcon, ForkIcon, StarIcon } from "../components/icons";
import InstallCommands from "../components/InstallCommands";
import { useRepo } from "../hooks/useRepo";
import { useHistory } from "../hooks/useHistory";
import { useReadme } from "../hooks/useReadme";
import { useFavouriteIds, useToggleFavourite } from "../hooks/useFavourites";
import { compactNumber, relativeTime, safeExternalUrl } from "../lib/format";
import CompareButton from "../components/CompareButton";
import RelatedRepos from "../components/RelatedRepos";

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
  const readme = useReadme(owner, name);
  const { data: favIds } = useFavouriteIds();
  const toggle = useToggleFavourite();
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const readmeRef = useRef<HTMLDivElement>(null);

  const points = history.data?.points ?? [];
  const tracked = points.length > 1;
  const isFav = repo ? (favIds?.ids.includes(repo.id) ?? false) : false;
  const readmeHtml = readme.data?.html ?? null;
  const readmeLong = readmeHtml !== null && readmeHtml.length > 4000;

  // GitHub-style hover-to-copy buttons on every README code block.
  // The README is injected via dangerouslySetInnerHTML, so buttons are
  // attached imperatively once the HTML lands.
  useEffect(() => {
    const root = readmeRef.current;
    if (!root) return;
    const COPY_SVG =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const CHECK_SVG =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    root.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".readme-copy")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "readme-copy";
      btn.title = "Copy";
      btn.setAttribute("aria-label", "Copy code block");
      btn.innerHTML = COPY_SVG;
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent ?? "");
        } catch {
          const ta = document.createElement("textarea");
          ta.value = pre.textContent ?? "";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        btn.innerHTML = CHECK_SVG;
        btn.classList.add("copied");
        setTimeout(() => {
          btn.innerHTML = COPY_SVG;
          btn.classList.remove("copied");
        }, 1600);
      });
      pre.appendChild(btn);
    });
  }, [readmeHtml]);

  // How much real data the selected window actually covers.
  const spanDays = tracked
    ? (new Date(points[points.length - 1].t).getTime() - new Date(points[0].t).getTime()) / 86_400_000
    : 0;
  const windowLimited = tracked && spanDays + 0.5 < Number(days);
  const trendDelta = tracked ? points[points.length - 1].stars - points[0].stars : null;
  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
                <button
        onClick={() => navigate(-1)}
        className="sticky top-3 z-30 self-start rounded-full bg-surface/80 backdrop-blur px-3.5 py-1.5 text-xs text-muted hover:text-text transition-colors"
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
				<div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-4 sm:flex sm:flex-wrap sm:gap-4">
					<img src={repo.ownerAvatar} alt="" className="w-14 h-14 rounded-xl ring-1 ring-border" />
					<div className="flex-1 min-w-0">
						<h1 className="font-display text-lg sm:text-xl font-extrabold tracking-tight break-words">{repo.fullName}</h1>
						{repo.description && (
							<p className="text-muted text-sm mt-1 leading-relaxed">{repo.description}</p>
						)}
					</div>
					<div className="col-span-2 flex w-full gap-2 sm:ml-auto sm:w-auto">
						<button
							onClick={() => toggle.mutate({ repo, fav: isFav })}
							className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:flex-none ${
                    isFav
                      ? "border-accent/50 text-accent bg-accent/10"
                      : "border-border text-muted hover:text-text hover:border-primary/50"
                  }`}
                >
                  <StarIcon size={14} fill={isFav ? "currentColor" : "none"} />
                  {isFav ? "Favourited" : "Favourite"}
                </button>
                <CompareButton repo={repo} label />
                <a
                  href={safeExternalUrl(repo.htmlUrl, repo.fullName)}
							 target="_blank"
							rel="noreferrer"
							className="btn-primary flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:flex-none"
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
                    className="text-[10px] px-2 py-0.5 rounded-full bg-elevated text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <section className="panel p-4 sm:p-5 animate-fade-up" aria-labelledby="signal-brief-heading">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="eyebrow !text-[9px]">Decision brief</span>
                <h2 id="signal-brief-heading" className="font-semibold text-sm mt-1">Why look now?</h2>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${trendDelta && trendDelta > 0 ? "bg-success/15 text-success" : "bg-elevated text-muted"}`}>
                {trendDelta && trendDelta > 0 ? "Gaining attention" : "Worth a closer look"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-4 sm:grid-cols-4">
              <div className="rounded-xl bg-elevated/60 p-3">
                <div className="eyebrow !text-[8px]">Momentum</div>
                <div className="font-mono text-sm font-bold mt-1.5 text-success">
                  {trendDelta == null ? "New" : `${trendDelta >= 0 ? "+" : ""}${trendDelta.toLocaleString()}`}
                </div>
                <div className="text-[10px] text-muted mt-0.5">stars / {days}d</div>
              </div>
              <div className="rounded-xl bg-elevated/60 p-3">
                <div className="eyebrow !text-[8px]">Evidence</div>
                <div className="font-mono text-sm font-bold mt-1.5">{points.length}</div>
                <div className="text-[10px] text-muted mt-0.5">snapshots</div>
              </div>
              <div className="rounded-xl bg-elevated/60 p-3">
                <div className="eyebrow !text-[8px]">Activity</div>
                <div className="font-mono text-sm font-bold mt-1.5">{relativeTime(repo.pushedAt)}</div>
                <div className="text-[10px] text-muted mt-0.5">last pushed</div>
              </div>
              <div className="rounded-xl bg-elevated/60 p-3">
                <div className="eyebrow !text-[8px]">Status</div>
                <div className="font-mono text-sm font-bold mt-1.5">{isFav ? "Watching" : "Discover"}</div>
                <div className="text-[10px] text-muted mt-0.5">{tracked ? `${Math.max(1, Math.round(spanDays))}d coverage` : "not tracked"}</div>
              </div>
            </div>
          </section>

          <div className="panel p-5 sm:p-6 animate-fade-up">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow !text-[9px]">Star history</span>
              <div className="w-full sm:ml-auto sm:w-auto">
                <SegmentedControl value={days} options={DAYS_OPTIONS} onChange={setDays} ariaLabel="History window" />
              </div>
            </div>
            <div className="mt-4">
              {history.isLoading ? (
                <div className="skeleton h-44 w-full" />
              ) : tracked ? (
                <>
                  <HistoryChart points={points} />
                  <div className="flex items-center justify-between mt-2 font-mono tabular-nums text-[10px] text-muted">
                    <span>{fmtDay(points[0].t)}</span>
                    <span>{points.length} snapshots</span>
                    <span>{fmtDay(points[points.length - 1].t)}</span>
                  </div>
                  {windowLimited && (
                    <p className="text-[11px] text-muted mt-2">
                      Tracking only started {fmtDay(points[0].t)} — the {days}-day window currently
                      covers {Math.max(1, Math.round(spanDays))} day{Math.round(spanDays) === 1 ? "" : "s"} of data.
                      The chart fills in as snapshots accumulate.
                    </p>
                  )}
                </>
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
          <div className="panel p-5 sm:p-6 animate-fade-up">
            <span className="eyebrow !text-[9px]">About</span>
            {readme.isLoading ? (
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="skeleton h-3.5 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            ) : readmeHtml ? (
              <>
                <InstallCommands html={DOMPurify.sanitize(readmeHtml)} />
                <div
                  ref={readmeRef}
                  className={`readme mt-3 ${readmeLong && !readmeExpanded ? "max-h-[420px] overflow-hidden" : ""}`}
                  style={
                    readmeLong && !readmeExpanded
                      ? { maskImage: "linear-gradient(to bottom, black 75%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent)" }
                      : undefined
                  }
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(readmeHtml) }}
                />
                {readmeLong && (
                  <button
                    onClick={() => setReadmeExpanded((v) => !v)}
                    className="text-xs text-primary hover:underline mt-2"
                  >
                    {readmeExpanded ? "Show less" : "Read more"}
                  </button>
                )}
              </>
            ) : (
              <p className="text-muted text-sm mt-3">No README available for this repository.</p>
            )}
          </div>
          <RelatedRepos repo={repo} />
        </>
      )}
    </div>
  );
}
