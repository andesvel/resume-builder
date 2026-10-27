import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("resumes", "routes/resumes.tsx"),
  route("settings", "routes/settings.tsx"),
  route("agents", "routes/agents.tsx"),
  route("r/:id", "routes/editor.tsx"),
  route("import/:id", "routes/import.tsx"),
  route("locale", "routes/locale.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("llms.txt", "routes/llms.ts"),
] satisfies RouteConfig;
