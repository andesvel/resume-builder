import { defineConfig } from "vitest/config";

// Unit tests run against plain modules, without the Workers/React Router plugins.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["app/**/*.test.ts"],
    passWithNoTests: true,
  },
});
