import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

/** Browser entry points of react-pdf's stack; they need no file system. */
const BROWSER_ENTRIES: Record<string, string> = {
  "@react-pdf/renderer": "lib/react-pdf.browser.js",
  "@react-pdf/font": "lib/index.browser.js",
  "@react-pdf/image": "lib/index.browser.js",
  fontkit: "dist/browser-module.mjs",
  pdfkit: "js/pdfkit.browser.mjs",
};

function packageRoot(file: string, name: string): string | null {
  let dir = path.dirname(file);
  while (dir !== path.dirname(dir)) {
    const manifest = path.join(dir, "package.json");
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, "utf8")).name === name) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Yoga ships its WebAssembly as base64 and compiles it at runtime, which
 * Workers forbid. Write it out as a real .wasm file once, so the Worker can
 * import it as a precompiled WebAssembly.Module.
 */
function extractYogaWasm(yogaBinary: string): string {
  const out = path.resolve("node_modules/.cache/react-pdf-workers/yoga.wasm");
  if (!existsSync(out)) {
    const base64 = readFileSync(yogaBinary, "utf8").match(/data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/)?.[1];
    if (!base64) throw new Error("react-pdf-for-workers: embedded Yoga wasm not found");
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(base64, "base64"));
  }
  return out;
}

/**
 * Lets react-pdf render inside the Worker (for the MCP PDF export).
 * On the server Vite picks the Node builds, which read fonts and color
 * profiles from disk. The browser builds embed them, so the Worker uses those,
 * with a fixed `import.meta.url` (bundled Worker modules have none).
 */
export function reactPdfForWorkers(): Plugin {
  return {
    name: "react-pdf-for-workers",
    enforce: "pre",
    // Dev pre-bundles dependencies without plugins, so server-side PDF export
    // only works in builds (`pnpm preview`, deployments).
    apply: "build",
    applyToEnvironment: (env) => env.name === "ssr",
    async resolveId(source, importer) {
      const entry = BROWSER_ENTRIES[source];
      if (!entry) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      const root = resolved && packageRoot(resolved.id, source);
      return root ? path.join(root, entry) : null;
    },
    transform(code, id) {
      // yoga-layout/load: hand Emscripten the precompiled module instead of bytes.
      if (id.includes("/yoga-layout/dist/src/load.js")) {
        const wasm = extractYogaWasm(path.join(path.dirname(id), "../binaries/yoga-wasm-base64-esm.js"));
        return {
          code:
            `import yogaModule from ${JSON.stringify(wasm)};\n` +
            code.replace(
              "loadYogaImpl()",
              "loadYogaImpl({ instantiateWasm(imports, done) { WebAssembly.instantiate(yogaModule, imports).then((instance) => done(instance, yogaModule)); return {}; } })",
            ),
          map: null,
        };
      }
      if (!code.includes("import.meta.url") || !Object.keys(BROWSER_ENTRIES).some((pkg) => id.includes(`/${pkg}/`))) return null;
      return { code: code.replaceAll("import.meta.url", JSON.stringify("file:///react-pdf/")), map: null };
    },
  };
}
