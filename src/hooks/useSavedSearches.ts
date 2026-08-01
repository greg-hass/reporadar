import { useEffect, useState } from "react";
import type { SortKey } from "../lib/types";

export interface SavedSearch {
  id: string;
  label: string;
  q: string;
  language: string;
  minStars: number;
  createdSinceDays: number;
  sort: SortKey;
}

const STORAGE_KEY = "reporadar-saved-searches";

function load(): SavedSearch[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedSearch[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
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
      setSaved((current) => [
        { ...search, id: `${search.q}:${search.language}:${search.minStars}:${search.createdSinceDays}:${search.sort}` },
        ...current.filter((item) => item.id !== `${search.q}:${search.language}:${search.minStars}:${search.createdSinceDays}:${search.sort}`),
      ].slice(0, 12));
    },
    remove: (id: string) => setSaved((current) => current.filter((item) => item.id !== id)),
  };
}
