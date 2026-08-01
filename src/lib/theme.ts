export type ThemeName = "aurora" | "gh-dark" | "tokyo-night" | "midnight" | "dracula" | "nord" | "light";

export interface ThemeOption {
  id: ThemeName;
  label: string;
  description: string;
  dark: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "aurora", label: "Aurora", description: "RepoRadar's violet-blue default", dark: true },
  { id: "gh-dark", label: "GitHub Dark", description: "Familiar GitHub contrast", dark: true },
  { id: "tokyo-night", label: "Tokyo Night", description: "Cool blue-purple night tones", dark: true },
  { id: "midnight", label: "Midnight", description: "Deep navy with electric blue", dark: true },
  { id: "dracula", label: "Dracula", description: "High-contrast purple neon", dark: true },
  { id: "nord", label: "Nord", description: "Calm arctic blue-gray", dark: true },
  { id: "light", label: "Light", description: "Clean daylight mode", dark: false },
];

const DATA_THEME: Record<ThemeName, string | null> = {
  aurora: null,           // :root default; no data-theme attr
  "gh-dark": "gh-dark",
  "tokyo-night": "tokyo-night",
  midnight: "midnight",
  dracula: "dracula",
  nord: "nord",
  light: "light",
};

export function applyTheme(theme: ThemeName): void {
  const attr = DATA_THEME[theme];
  const html = document.documentElement;
  if (attr === null) {
    html.removeAttribute("data-theme");
    html.classList.add("dark");
  } else {
    html.setAttribute("data-theme", attr);
    html.classList.toggle("dark", attr !== "light");
  }
  localStorage.setItem("reporadar-theme", theme);
}

export function getStoredTheme(): ThemeName {
  const stored = localStorage.getItem("reporadar-theme");
  return THEME_OPTIONS.some((option) => option.id === stored) ? stored as ThemeName : "aurora";
}
