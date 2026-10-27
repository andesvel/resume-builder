import type { Route } from "./+types/robots";

/** Public pages are open to search engines and AI crawlers alike; per-user and API paths are not. */
export function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /r/",
    "Disallow: /import/",
    "Disallow: /resumes",
    "Disallow: /settings",
    "Disallow: /locale",
    "Disallow: /api/",
    "Disallow: /mcp",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
