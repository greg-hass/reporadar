import type { ComponentType } from "react";
import { SearchIcon, SparklesIcon, StarIcon, TrendingUpIcon } from "./icons";

export interface NavTab {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const NAV_TABS: NavTab[] = [
  { to: "/", label: "Trending", icon: TrendingUpIcon },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/new", label: "Fresh", icon: SparklesIcon },
  { to: "/favourites", label: "Favourites", icon: StarIcon },
];
