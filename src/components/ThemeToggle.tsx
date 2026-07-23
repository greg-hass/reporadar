import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, type ThemeName } from "../lib/theme";

const ORDER: ThemeName[] = ["aurora", "gh-dark", "light"];
const LABEL: Record<ThemeName, string> = { aurora: "Aurora", "gh-dark": "GitHub Dark", light: "Light" };

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const next = () => {
    const i = ORDER.indexOf(theme);
    setTheme(ORDER[(i + 1) % ORDER.length]);
  };

  return (
    <button
      onClick={next}
      className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-text"
      title="Cycle theme"
    >
      {LABEL[theme]}
    </button>
  );
}
