import { LanguagesIcon } from "lucide-react";
import { useFetcher, useLocation } from "react-router";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { locales } from "~/i18n/config";
import { useI18n } from "~/i18n";

const labels = { en: "English", es: "Español" } as const;

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const fetcher = useFetcher();
  const location = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.language")}>
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) =>
            fetcher.submit(
              { locale: value, redirectTo: location.pathname + location.search },
              { method: "post", action: "/locale" },
            )
          }
        >
          {locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l}>
              {labels[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
