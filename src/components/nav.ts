import type { ComponentType } from "react";
import { SearchIcon, SparklesIcon, StarIcon, TrendingUpIcon } from "./icons";

export interface NavTab {
  to: string;
  label: string;
  mobileLabel?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const NAV_TABS: NavTab[] = [
  { to: "/", label: "Trending", icon: TrendingUpIcon },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/new", label: "New & rising", mobileLabel: "New", icon: SparklesIcon },
  { to: "/favourites", label: "Watchlist", mobileLabel: "Watchlist", icon: StarIcon },
];
