import { FileTextIcon, FilesIcon, HouseIcon, SettingsIcon } from "lucide-react";
import { useRef } from "react";
import { Link, NavLink } from "react-router";

import { type MessageKey, useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

const links: { to: string; label: MessageKey; icon: typeof HouseIcon }[] = [
  { to: "/", label: "nav.home", icon: HouseIcon },
  { to: "/resumes", label: "nav.resumes", icon: FilesIcon },
  { to: "/settings", label: "nav.settings", icon: SettingsIcon },
];

/** How far the pill leans toward the cursor, in px, and how much it grows on hover. */
const LEAN_X = 4;
const LEAN_Y = 2;
const HOVER_SCALE = 1.015;

/**
 * Floating pill navigation. On hover it grows slightly and leans a few pixels
 * toward the pointer; with reduced motion it stays still.
 */
export function SiteHeader() {
  const { t } = useI18n();
  const pill = useRef<HTMLElement>(null);

  const still = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = pill.current;
    if (!el || e.pointerType !== "mouse" || still()) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    el.style.transform = `translate(${(x * LEAN_X).toFixed(2)}px, ${(y * LEAN_Y).toFixed(2)}px) scale(${HOVER_SCALE})`;
  };

  const onPointerLeave = () => {
    if (pill.current) pill.current.style.transform = "";
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 [view-transition-name:site-header]">
      <header
        ref={pill}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="pointer-events-auto flex h-12 items-center gap-1 rounded-full border bg-background px-2 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-transform"
      >
        <Link to="/" viewTransition className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium sm:flex">
          <FileTextIcon className="size-4" aria-hidden />
          <span className="hidden md:inline">{t("app.name")}</span>
        </Link>
        <nav aria-label={t("nav.main")} className="flex items-center gap-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              viewTransition
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                  isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon className="size-4 sm:hidden" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t(label)}</span>
            </NavLink>
          ))}
        </nav>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <LocaleSwitcher />
        <ThemeToggle />
      </header>
    </div>
  );
}
