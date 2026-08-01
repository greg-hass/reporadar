import { useToast } from "./Toast";
import { THEME_OPTIONS } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";
import { MoonIcon, SparklesIcon, StarIcon, SunIcon } from "./icons";

const ICON = {
  aurora: SparklesIcon,
  "gh-dark": MoonIcon,
  "tokyo-night": StarIcon,
  midnight: MoonIcon,
  dracula: SparklesIcon,
  nord: MoonIcon,
  light: SunIcon,
} as const;

interface Props {
  /** "row" shows icon + label (sidebar); "icon" is a compact button (header). */
  variant?: "row" | "icon";
}

export default function ThemeToggle({ variant = "row" }: Props) {
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const current = THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[0];

  const next = () => {
    const i = THEME_OPTIONS.findIndex((option) => option.id === theme);
    const nextTheme = THEME_OPTIONS[(i + 1) % THEME_OPTIONS.length];
    setTheme(nextTheme.id);
    toast.show(`${nextTheme.label} theme selected`);
  };

  const Icon = ICON[theme];
  const label = `Theme: ${current.label} — click to switch`;

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
      {current.label}
    </button>
  );
}
