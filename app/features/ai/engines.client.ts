/**
 * Browser-only entry to the engines. Being a `.client` module, React Router
 * swaps it for an empty stub on the server, which keeps WebLLM and its worker
 * out of the Worker bundle.
 */
export { chromeAvailability, createChromeEngine } from "./chrome-engine";
export {
  cachedBuilds,
  cachedBuildSizes,
  clearModelCaches,
  createWebLlmEngine,
  deleteCachedBuild,
  detectDevice,
  webLlmAvailability,
} from "./webllm-engine";
