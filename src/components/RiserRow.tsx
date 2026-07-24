import { useEffect, useRef } from "react";
import type { Repo } from "../lib/types";
import Sparkline from "./Sparkline";

interface Props {
  repo: Repo;
  rank: number; // 1-based
  /** riser window in days — used for the per-day velocity figure */
  windowDays: number;
  window: string; // "1d" | "7d" | "30d", shown next to the total delta
  selected: boolean;
  stagger: number;
}

function LanguageDot({ language }: { language: string | null }) {
  let hash = 0;
  if (language) for (const c of language) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = language ? hash % 360 : 0;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5 shrink-0"
      style={{ backgroundColor: language ? `hsl(${hue} 60% 60%)` : "var(--color-muted)" }}
    />
  );
}

export default function RiserRow({ repo, rank, windowDays, window, selected, stagger }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const delta = repo.starDelta ?? 0;
  const perDay = Math.round(delta / windowDays);
  const history = repo.history ?? null;

  return (
    <div
      ref={ref}
      className={`card flex items-center gap-3 sm:gap-5 px-4 sm:px-5 py-4 animate-fade-up ${
        selected ? "!border-primary/60 !bg-elevated/50" : "hover:border-primary/40"
      }`}
      style={{ animationDelay: `${Math.min(stagger, 12) * 40}ms` }}
    >
      <span
        className={`font-mono tabular-nums text-xl sm:text-2xl font-extrabold w-8 shrink-0 text-center ${
          rank === 1 ? "text-transparent bg-clip-text" : "text-border"
        }`}
        style={
          rank === 1
            ? { backgroundImage: "linear-gradient(135deg, var(--color-accent), var(--color-primary))" }
            : undefined
        }
      >
        {String(rank).padStart(2, "0")}
      </span>

      <img
        src={repo.ownerAvatar}
        alt=""
        className="w-9 h-9 rounded-lg ring-1 ring-border shrink-0"
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
        {repo.description && (
          <p className="hidden sm:block text-muted text-xs truncate mt-0.5">{repo.description}</p>
        )}
        <span className="flex items-center text-[11px] text-muted mt-1">
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

      <div className="text-right shrink-0 border-l border-border/60 pl-3 sm:pl-5">
        <div className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-success leading-none">
          +{perDay.toLocaleString()}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-muted mt-1">stars / day</div>
        <div className="font-mono tabular-nums text-[10px] text-muted mt-1">
          +{delta.toLocaleString()} · {window}
        </div>
      </div>
    </div>
  );
}
