import { FileTextIcon } from "lucide-react";
import { Link } from "react-router";

import { useI18n } from "~/i18n";

import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-medium">
          <FileTextIcon className="size-4" />
          {t("app.name")}
        </Link>
        <div className="flex flex-1 items-center justify-end gap-1">
          {children}
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
