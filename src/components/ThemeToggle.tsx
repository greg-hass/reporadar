import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, type ThemeName } from "../lib/theme";
import { MoonIcon, SparklesIcon, SunIcon } from "./icons";

const ORDER: ThemeName[] = ["aurora", "gh-dark", "light"];
const LABEL: Record<ThemeName, string> = { aurora: "Aurora", "gh-dark": "GitHub Dark", light: "Light" };
const ICON = { aurora: SparklesIcon, "gh-dark": MoonIcon, light: SunIcon } as const;

interface Props {
  /** "row" shows icon + label (sidebar); "icon" is a compact button (header). */
  variant?: "row" | "icon";
}

export default function ThemeToggle({ variant = "row" }: Props) {
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const next = () => {
    const i = ORDER.indexOf(theme);
    setTheme(ORDER[(i + 1) % ORDER.length]);
  };

  const Icon = ICON[theme];
  const label = `Theme: ${LABEL[theme]} — click to switch`;

  if (variant === "icon") {
    return (
      <button
        onClick={next}
        aria-label={label}
        title={label}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted hover:text-text hover:border-primary/50 transition-colors"
      >
        <Icon size={17} />
      </button>
    );
  }

  return (
    <button
      onClick={next}
      aria-label={label}
      title={label}
      className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-muted hover:text-text hover:bg-surface transition-colors"
    >
      <Icon size={16} />
      {LABEL[theme]}
    </button>
  );
}
