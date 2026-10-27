import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Route chunk splitting (default in v8) loads HydrateFallback as a separate
  // chunk; routes that only have a clientLoader then fail to hydrate and React
  // 19 leaves the server markup in <body> next to the client tree.
  splitRouteModules: false,
} satisfies Config;
