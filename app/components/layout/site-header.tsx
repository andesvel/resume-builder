import { FileTextIcon, FilesIcon, HouseIcon, SettingsIcon } from "lucide-react";
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

/** Floating pill navigation. */
export function SiteHeader() {
  const { t } = useI18n();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 [view-transition-name:site-header]">
      <header className="pointer-events-auto flex h-12 items-center gap-1 rounded-full border bg-background px-2 shadow-sm">
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
