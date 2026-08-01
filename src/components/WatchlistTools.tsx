import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Repo } from "../lib/types";
import { putFavourite } from "../lib/api";
import { CheckIcon, CopyIcon } from "./icons";
import { useToast } from "./Toast";

interface WatchlistExport {
  version: 1;
  exportedAt: string;
  repos: Repo[];
}

function isRepo(value: unknown): value is Repo {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Repo>;
  return Number.isFinite(candidate.id) && typeof candidate.fullName === "string" && candidate.fullName.includes("/");
}

export default function WatchlistTools({ items }: { items: Repo[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [importing, setImporting] = useState(false);

  const exportWatchlist = () => {
    const payload: WatchlistExport = { version: 1, exportedAt: new Date().toISOString(), repos: items };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reporadar-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.show(`${items.length} watchlist repo${items.length === 1 ? "" : "s"} exported.`);
  };

  const importWatchlist = async (file: File) => {
    setImporting(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const candidate = Array.isArray(parsed) ? parsed : (parsed as { repos?: unknown } | null)?.repos;
      const repos = Array.isArray(candidate) ? candidate.filter(isRepo).slice(0, 100) : [];
      if (repos.length === 0) throw new Error("No valid RepoRadar repos found in that file.");
      for (const repo of repos) await putFavourite(repo);
      await queryClient.invalidateQueries({ queryKey: ["favourites"] });
      await queryClient.invalidateQueries({ queryKey: ["favourite-ids"] });
      toast.show(`${repos.length} repo${repos.length === 1 ? "" : "s"} added to your watchlist.`);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Couldn't import that watchlist.");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <div className="eyebrow !text-[9px]">Your data</div>
        <p className="text-xs text-muted mt-0.5">Keep your watchlist portable across devices.</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={exportWatchlist} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-text hover:border-primary/50">
          <CopyIcon size={13} /> Export
        </button>
        <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importWatchlist(file);
        }} />
        <button type="button" disabled={importing} onClick={() => inputRef.current?.click()} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs">
          <CheckIcon size={13} /> {importing ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}
