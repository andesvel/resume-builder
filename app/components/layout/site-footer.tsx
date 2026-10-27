import { useI18n } from "~/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t [view-transition-name:site-footer]">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>{t("footer.madeBy")}</p>
        <p>{t("footer.privacy")}</p>
      </div>
    </footer>
  );
}
