import { FileTextIcon, FilesIcon, HouseIcon, SettingsIcon } from "lucide-react";
import { Link, NavLink } from "react-router";

import { Button } from "~/components/ui/button";
import { type MessageKey, useI18n } from "~/i18n";
import { REPO_URL } from "~/lib/seo";
import { cn } from "~/lib/utils";

import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";


const links: { to: string; label: MessageKey; icon: typeof HouseIcon }[] = [
  { to: "/", label: "nav.home", icon: HouseIcon },
  { to: "/resumes", label: "nav.resumes", icon: FilesIcon },
  { to: "/settings", label: "nav.settings", icon: SettingsIcon },
];

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background [view-transition-name:site-header]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link to="/" viewTransition className="mr-2 hidden items-center gap-2 font-medium sm:flex">
          <FileTextIcon className="size-4" aria-hidden />
          {t("app.name")}
        </Link>
        <nav aria-label={t("nav.main")} className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              viewTransition
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon className="size-4 sm:hidden" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t(label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label={t("nav.repo")}>
              <GitHubIcon className="size-4" />
            </a>
          </Button>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
