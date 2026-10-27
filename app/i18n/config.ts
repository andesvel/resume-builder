export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Resolve the UI locale from the cookie first, then Accept-Language. */
export function resolveLocale(request: Request): Locale {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  if (match && isLocale(match[1])) return match[1];

  const accept = request.headers.get("Accept-Language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return defaultLocale;
}

export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
