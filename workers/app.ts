import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createRequestHandler, RouterContextProvider } from "react-router";

import { cloudflareContext } from "~/lib/cloudflare";
import { DraftStore, draftStore } from "~/mcp/draft-store.server";
import { createMcpServer } from "~/mcp/mcp-server.server";
import { renderPdf } from "~/mcp/render-pdf.server";

export { DraftStore };

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

/** Constant-time check of `Authorization: Bearer <MCP_TOKEN>`. Fails closed when no token is configured. */
function authorized(request: Request, env: Env): boolean {
  const expected = env.MCP_TOKEN;
  const header = request.headers.get("Authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || given.length !== expected.length) return false;
  const encoder = new TextEncoder();
  // Workers-only API; the DOM lib's SubtleCrypto type doesn't declare it.
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean };
  return subtle.timingSafeEqual(encoder.encode(given), encoder.encode(expected));
}

async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (!env.MCP_TOKEN) return new Response("MCP is not configured on this deployment.", { status: 503 });
  if (!authorized(request, env)) {
    return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="resume-builder"' } });
  }
  // Stateless: a fresh server and transport per request, state lives in the DraftStore.
  const server = createMcpServer({ env, origin: new URL(request.url).origin });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

/** GET /api/drafts/:id/(resume|cover-letter).pdf — capability URL: the unguessable id is the access. */
async function handleDraftPdf(request: Request, env: Env, id: string, file: string): Promise<Response> {
  const resume = await draftStore(env).get(id);
  if (!resume) return new Response("Not found", { status: 404 });
  const kind = file === "resume.pdf" ? "resume" : "cover_letter";
  const bytes = await renderPdf(env, new URL(request.url).origin, resume, kind);
  return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") return handleMcp(request, env);
    const pdf = url.pathname.match(/^\/api\/drafts\/([\w-]{36})\/(resume|cover-letter)\.pdf$/);
    if (pdf && request.method === "GET") return handleDraftPdf(request, env, pdf[1] as string, `${pdf[2]}.pdf`);

    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
