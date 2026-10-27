import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { reactPdfForWorkers } from "./vite/react-pdf-workers";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    reactPdfForWorkers(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
