import { CreateActions } from "~/features/home/create-actions";
import { Features } from "~/features/landing/features";
import { SamplePreview } from "~/features/landing/sample-preview";
import { getT, useI18n } from "~/i18n";
import { REPO_URL, rootData, seo, SITE_NAME } from "~/lib/seo";

import type { Route } from "./+types/home";

export function meta({ matches }: Route.MetaArgs) {
  const root = rootData(matches);
  const t = getT(root.locale);
  return seo({
    title: t("seo.homeTitle"),
    description: t("seo.homeDescription"),
    path: "/",
    root,
    jsonLd: {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: `${root.origin}/`,
      description: t("seo.homeDescription"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires a modern browser; local AI needs WebGPU or Chrome's built-in AI",
      inLanguage: ["en", "es"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Natural-language resume input with on-device AI",
        "ATS-friendly PDF templates",
        "Cover letter drafting",
        "Import from PDF, Word and LinkedIn",
        "MCP server for AI agents",
        "English and Spanish",
      ],
      author: { "@type": "Person", name: "Andres" },
      sameAs: [REPO_URL],
    },
  });
}

export default function Home() {
  const { t } = useI18n();
  return (
    <main className="mx-auto grid max-w-5xl gap-16 px-4 py-12 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("landing.title")}</h1>
          <p className="max-w-prose text-lg text-pretty text-muted-foreground">{t("landing.subtitle")}</p>
          <CreateActions />
        </div>
        <div className="mx-auto w-full max-w-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:delay-100 motion-safe:duration-500 motion-safe:fill-mode-both lg:max-w-none">
          <SamplePreview />
        </div>
      </section>
      <Features />
    </main>
  );
}
