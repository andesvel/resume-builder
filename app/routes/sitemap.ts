import type { Route } from "./+types/sitemap";

const PAGES = ["/", "/agents"];

export function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const urls = PAGES.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
