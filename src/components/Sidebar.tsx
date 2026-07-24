import { NavLink } from "react-router-dom";
import { NAV_TABS } from "./nav";
import { Logo } from "./icons";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[232px] shrink-0 flex-col border-r border-border/70 bg-surface/40 backdrop-blur sticky top-0 h-screen p-4">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <Logo size={28} />
        <span className="font-extrabold text-lg tracking-tight">RepoRadar</span>
      </div>
      <div className="text-muted text-[10px] font-semibold uppercase tracking-widest mb-2 px-3">
        Discover
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-muted hover:text-text hover:bg-surface"
              }`
            }
          >
            <t.icon size={17} />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border/70 pt-3">
        <ThemeToggle variant="row" />
      </div>
    </aside>
  );
}
