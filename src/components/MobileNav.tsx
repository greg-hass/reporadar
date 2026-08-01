import { NavLink } from "react-router-dom";
import { NAV_TABS } from "./nav";

/** Bottom tab bar for phones (hidden on tablet and desktop). */
export default function MobileNav() {
  return (
    <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {NAV_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`
            }
          >
            <t.icon size={20} />
            {t.mobileLabel ?? t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
