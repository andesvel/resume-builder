import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("r/:id", "routes/editor.tsx"),
  route("locale", "routes/locale.ts"),
] satisfies RouteConfig;
