import { NavLink } from "react-router-dom";
import { NAV_TABS } from "./nav";
import { Logo } from "./icons";
import ThemeToggle from "./ThemeToggle";
import { SettingsIcon } from "./icons";

/** Sticky top bar for tablets and phones (hidden on desktop). */
export default function Header() {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-bg/80 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2.5 px-4 h-14">
        <Logo size={24} />
        <span className="font-extrabold tracking-tight">RepoRadar</span>
        {/* Inline tabs where there's room for them (iPad); phones use the bottom tab bar. */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {NAV_TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted hover:text-text"
                }`
              }
            >
              <t.icon size={15} />
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NavLink
            to="/settings"
            aria-label="Open settings"
            title="Settings"
            className={({ isActive }) => `flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${isActive ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted hover:border-primary/50 hover:text-text"}`}
          >
            <SettingsIcon size={17} />
          </NavLink>
          <ThemeToggle variant="icon" />
        </div>
      </div>
    </header>
  );
}
