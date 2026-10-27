import { SiteHeader } from "~/components/layout/site-header";
import { useI18n } from "~/i18n";

export function meta() {
  return [{ title: "Resume Builder" }];
}

export default function Home() {
  const { t } = useI18n();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-muted-foreground">{t("app.tagline")}</p>
      </main>
    </>
  );
}
