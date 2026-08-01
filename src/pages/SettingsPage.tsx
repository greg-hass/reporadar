import { Link } from "react-router-dom";
import { SettingsIcon } from "../components/icons";
import { THEME_OPTIONS } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <SettingsIcon size={19} />
        </div>
        <div>
          <div className="eyebrow !text-[9px]">Personal console</div>
          <h1 className="mt-0.5 text-lg font-bold leading-tight">Settings</h1>
          <p className="mt-0.5 text-xs text-muted">Shape RepoRadar around how you discover.</p>
        </div>
      </div>

      <section className="panel p-4 sm:p-5" aria-labelledby="appearance-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow !text-[9px]">Appearance</span>
            <h2 id="appearance-heading" className="mt-1 text-sm font-semibold">Choose your atmosphere</h2>
            <p className="mt-1 text-xs text-muted">Theme changes are saved on this device.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            {THEME_OPTIONS.find((option) => option.id === theme)?.label ?? "Aurora"} active
          </span>
        </div>
        <div className="mt-4 grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const selected = option.id === theme;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                aria-pressed={selected}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-surface/50 hover:border-primary/50"}`}
              >
                <span className={`theme-swatch theme-swatch-${option.id}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{option.label}</span>
                    {selected && <span className="text-[9px] uppercase tracking-wider text-primary">Selected</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-4 sm:p-5" aria-labelledby="preferences-heading">
        <span className="eyebrow !text-[9px]">Preferences</span>
        <h2 id="preferences-heading" className="mt-1 text-sm font-semibold">Your discovery tools</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <Link to="/favourites" className="rounded-xl border border-border bg-surface/50 p-3.5 hover:border-primary/50">
            <div className="text-sm font-semibold">Watchlist alerts</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">Tune star thresholds, browser notifications, and your daily pulse.</p>
          </Link>
          <Link to="/search" className="rounded-xl border border-border bg-surface/50 p-3.5 hover:border-primary/50">
            <div className="text-sm font-semibold">Saved research</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">Return to saved searches without rebuilding your filters.</p>
          </Link>
        </div>
      </section>

    </div>
  );
}
