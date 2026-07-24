export interface Repo {
  id: number;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  starsTotal: number;
  forks: number;
  createdAt: string;   // ISO
  pushedAt: string;    // ISO
  license: string | null;
  ownerAvatar: string;
  htmlUrl: string;
  /** stars gained over the riser window; null when not tracked */
  starDelta?: number | null;
  /** recent snapshot points for the sparkline; null when not tracked */
  history?: number[] | null;
}

export type SortKey = "stars" | "updated" | "best-match" | "risers";

export interface Stats {
  reposTracked: number;
  snapshotsToday: number;
  starsGainedToday: number;
  lastSnapshotAt: string | null; // ISO
}

export interface SearchParams {
  q: string;
  language?: string;
  topics?: string[];
  minStars?: number;
  createdSinceDays?: number;
  sort?: SortKey;
  page?: number;
}
