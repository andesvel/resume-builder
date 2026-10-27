import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";

import { CoverLetterDocument } from "~/features/pdf/cover-letter-document";
import { preloadFont } from "~/features/pdf/fonts";
import { ResumeDocument } from "~/features/pdf/resume-document";
import { fontFor } from "~/features/resume/fonts";
import type { Resume } from "~/features/resume/schema";

export type PdfDocumentKind = "resume" | "cover_letter";

async function assetAsDataUrl(env: Env, origin: string, path: string): Promise<string> {
  const response = await env.ASSETS.fetch(new URL(path, origin));
  if (!response.ok) throw new Error(`Font asset ${path} not found (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:font/woff;base64,${btoa(binary)}`;
}

/** Same documents as the browser export, rendered inside the Worker. */
export async function renderPdf(env: Env, origin: string, resume: Resume, kind: PdfDocumentKind): Promise<Uint8Array> {
  if (import.meta.env.DEV) {
    throw new Error("Server-side PDF export needs a build: run `pnpm preview` (see vite/react-pdf-workers.ts).");
  }
  await preloadFont(fontFor(resume), (path) => assetAsDataUrl(env, origin, path));
  const element = createElement(kind === "resume" ? ResumeDocument : CoverLetterDocument, { resume });
  const blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}
