import { useEffect, useState } from "react";
import type { SortKey } from "../lib/types";

export interface SavedSearch {
  id: string;
  label: string;
  q: string;
  language: string;
  topics: string;
  minStars: number;
  createdSinceDays: number;
  pushedSinceDays: number;
  sort: SortKey;
}

const STORAGE_KEY = "reporadar-saved-searches";

function searchId(search: Omit<SavedSearch, "id">): string {
  return [
    search.q,
    search.language,
    search.topics,
    search.minStars,
    search.createdSinceDays,
    search.pushedSinceDays,
    search.sort,
  ].join(":");
}

function normalizeSavedSearch(value: unknown): SavedSearch | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SavedSearch>;
  if (typeof candidate.q !== "string" || !candidate.q) return null;
  const minStars = Number.isFinite(candidate.minStars) ? Math.max(0, Number(candidate.minStars)) : 0;
  const createdSinceDays = Number.isFinite(candidate.createdSinceDays)
    ? Math.max(0, Number(candidate.createdSinceDays))
    : 0;
  const pushedSinceDays = Number.isFinite(candidate.pushedSinceDays)
    ? Math.max(0, Number(candidate.pushedSinceDays))
    : 0;
  const search = {
    label: typeof candidate.label === "string" && candidate.label ? candidate.label : candidate.q,
    q: candidate.q,
    language: typeof candidate.language === "string" ? candidate.language : "",
    topics: typeof candidate.topics === "string" ? candidate.topics : "",
    minStars,
    createdSinceDays,
    pushedSinceDays,
    sort: candidate.sort ?? "best-match",
  } satisfies Omit<SavedSearch, "id">;
  return { ...search, id: searchId(search) };
}

function load(): SavedSearch[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          const normalized = normalizeSavedSearch(item);
          return normalized ? [normalized] : [];
        }).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

export function useSavedSearches() {
  const [saved, setSaved] = useState<SavedSearch[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved]);

  return {
    saved,
    save: (search: Omit<SavedSearch, "id">) => {
      const id = searchId(search);
      setSaved((current) => [
        { ...search, id },
        ...current.filter((item) => item.id !== id),
      ].slice(0, 12));
    },
    remove: (id: string) => setSaved((current) => current.filter((item) => item.id !== id)),
  };
}
