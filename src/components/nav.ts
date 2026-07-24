import type { ComponentType } from "react";
import { ActivityIcon, SearchIcon, SparklesIcon, TrendingUpIcon } from "./icons";

export interface NavTab {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const NAV_TABS: NavTab[] = [
  { to: "/", label: "Pulse", icon: ActivityIcon },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/new", label: "New", icon: SparklesIcon },
  { to: "/risers", label: "Fast Risers", icon: TrendingUpIcon },
];
