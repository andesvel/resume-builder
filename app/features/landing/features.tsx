import { FileCheck2Icon, FileInputIcon, LanguagesIcon, LockIcon, MailIcon, PenLineIcon } from "lucide-react";

import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";

import { type MessageKey, useI18n } from "~/i18n";

const items: { icon: typeof PenLineIcon; title: MessageKey; body: MessageKey }[] = [
  { icon: PenLineIcon, title: "landing.f1Title", body: "landing.f1Body" },
  { icon: LockIcon, title: "landing.f2Title", body: "landing.f2Body" },
  { icon: FileCheck2Icon, title: "landing.f3Title", body: "landing.f3Body" },
  { icon: FileInputIcon, title: "landing.f4Title", body: "landing.f4Body" },
  { icon: MailIcon, title: "landing.f5Title", body: "landing.f5Body" },
  { icon: LanguagesIcon, title: "landing.f6Title", body: "landing.f6Body" },
];

export function Features() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="features-title" className="grid gap-8 border-t pt-12">
      <h2 id="features-title" className="text-2xl font-semibold tracking-tight">
        {t("landing.featuresTitle")}
      </h2>
      <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="grid content-start gap-2">
            <Icon className="size-5" aria-hidden />
            <h3 className="font-medium">{t(title)}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
          </li>
        ))}
      </ul>
      <Link to="/agents" viewTransition className="inline-flex items-center gap-1.5 justify-self-start text-sm font-medium underline-offset-4 hover:underline">
        {t("agents.landingCta")} <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
