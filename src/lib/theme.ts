export type ThemeName = "aurora" | "gh-dark" | "light";

const DATA_THEME: Record<ThemeName, string | null> = {
  aurora: null,           // :root default; no data-theme attr
  "gh-dark": "gh-dark",
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
  const stored = localStorage.getItem("reporadar-theme") as ThemeName | null;
  return stored ?? "aurora";
}
