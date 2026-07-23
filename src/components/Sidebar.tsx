import { NavLink } from "react-router-dom";

const TABS: { to: string; label: string; icon: string }[] = [
  { to: "/", label: "Search", icon: "🔍" },
  { to: "/new", label: "New", icon: "✦" },
  { to: "/risers", label: "Fast Risers", icon: "🚀" },
];

export default function Sidebar() {
  return (
    <aside className="w-[200px] shrink-0 border-r border-border bg-bg/60 p-4 flex flex-col">
      <div className="text-primary font-extrabold text-lg mb-6">⬢ RepoRadar</div>
      <div className="text-muted text-[10px] uppercase tracking-wider mb-2 px-2">Discover</div>
      <nav className="flex flex-col gap-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/"}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm ${
                isActive ? "bg-primary/20 text-primary font-bold" : "text-muted hover:text-text"
              }`
            }
          >
            <span className="mr-2">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        {/* ThemeToggle rendered by App to keep Sidebar focused on nav */}
      </div>
    </aside>
  );
}
