import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Repo } from "../lib/types";

const STORAGE_KEY = "reporadar-compare-repos";
const MAX_COMPARE = 3;

type CompareAction = "added" | "removed" | "limit";
interface CompareApi {
  repos: Repo[];
  isSelected: (id: number) => boolean;
  toggle: (repo: Repo) => CompareAction;
  remove: (id: number) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareApi>({
  repos: [],
  isSelected: () => false,
  toggle: () => "limit",
  remove: () => undefined,
  clear: () => undefined,
});

function load(): Repo[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Repo[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repo[]>(() => load());
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(repos)), [repos]);

  const value = useMemo<CompareApi>(() => ({
    repos,
    isSelected: (id) => repos.some((repo) => repo.id === id),
    toggle: (repo) => {
      if (repos.some((item) => item.id === repo.id)) {
        setRepos((current) => current.filter((item) => item.id !== repo.id));
        return "removed";
      }
      if (repos.length >= MAX_COMPARE) return "limit";
      setRepos((current) => [...current, repo]);
      return "added";
    },
    remove: (id) => setRepos((current) => current.filter((repo) => repo.id !== id)),
    clear: () => setRepos([]),
  }), [repos]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  return useContext(CompareContext);
}
