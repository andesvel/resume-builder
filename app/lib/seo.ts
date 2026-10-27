import type { MetaDescriptor } from "react-router";

import type { Locale } from "~/i18n/config";

export const SITE_NAME = "Resume Builder";
export const REPO_URL = "https://github.com/andesvel/resume-builder";

export interface RootData {
  locale: Locale;
  origin: string;
}

/** The root loader's data from a route's `meta` matches. */
export function rootData(matches: readonly ({ id: string; loaderData?: unknown } | undefined)[]): RootData {
  const data = matches.find((m) => m?.id === "root")?.loaderData as Partial<RootData> | undefined;
  return { locale: data?.locale ?? "en", origin: data?.origin ?? "" };
}

interface SeoInput {
  title: string;
  description: string;
  path: string;
  root: RootData;
  /** Private or per-user pages (editor, settings): keep them out of indexes. */
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

/** Title, description, canonical, Open Graph, Twitter and optional JSON-LD for a page. */
export function seo({ title, description, path, root, noindex, jsonLd }: SeoInput): MetaDescriptor[] {
  const url = `${root.origin}${path}`;
  const tags: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:locale", content: root.locale === "es" ? "es_ES" : "en_US" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (noindex) tags.push({ name: "robots", content: "noindex, nofollow" });
  if (jsonLd) tags.push({ "script:ld+json": { "@context": "https://schema.org", ...jsonLd } });
  return tags;
}
