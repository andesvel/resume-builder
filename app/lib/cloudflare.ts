import { createContext } from "react-router";

export interface CloudflareContext {
  env: Env;
  ctx: ExecutionContext;
}

/** Worker bindings, available to loaders/actions via `context.get(cloudflareContext)`. */
export const cloudflareContext = createContext<CloudflareContext>();
