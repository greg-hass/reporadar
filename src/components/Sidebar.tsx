import { NavLink } from "react-router-dom";
import { NAV_TABS } from "./nav";
import { Logo } from "./icons";
import ThemeToggle from "./ThemeToggle";
import { useStats } from "../hooks/useStats";
import { relativeTime } from "../lib/format";

export default function Sidebar() {
  const { data } = useStats();

  return (
    <aside className="hidden lg:flex w-[232px] shrink-0 flex-col bg-surface/40 backdrop-blur sticky top-0 h-screen p-4">
      <div className="flex items-center gap-2.5 px-2">
        <Logo size={30} />
        <div>
          <div className="font-extrabold tracking-tight leading-none">RepoRadar</div>
          <div className="eyebrow !text-[8px] mt-1">Tracking station</div>
        </div>
      </div>

      <div className="eyebrow !text-[9px] px-3 mt-8 mb-2">Console</div>
      <nav className="flex flex-col gap-1">
        {NAV_TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === "/"} className="group">
            {({ isActive }) => (
              <span
                className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "text-primary font-semibold" : "text-muted hover:text-text"
                }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: "linear-gradient(var(--color-accent), var(--color-primary))" }}
                  />
                )}
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-elevated/60 text-muted group-hover:text-text"
                  }`}
                >
                  <t.icon size={15} />
                </span>
                {t.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="stat-panel !p-3">
          <div className="eyebrow !text-[8px]">Last snapshot</div>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-medium">
            {data?.lastSnapshotAt ? (
              <>
                <span className="pulse-dot" />
                {relativeTime(data.lastSnapshotAt)}
              </>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
        </div>
        <ThemeToggle variant="row" />
      </div>
    </aside>
  );
}
