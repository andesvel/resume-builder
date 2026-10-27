import type { Resume } from "~/features/resume/schema";

/**
 * Render a resume to a PDF blob. react-pdf and the templates are loaded on
 * demand so they stay out of the initial bundle and never run on the server.
 */
export async function renderResumePdf(resume: Resume): Promise<Blob> {
  const [{ pdf }, { ResumeDocument }, { createElement }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./resume-document"),
    import("react"),
  ]);
  // ResumeDocument renders a <Document>; react-pdf's typing only accepts the element directly.
  const element = createElement(ResumeDocument, { resume }) as unknown as Parameters<typeof pdf>[0];
  return pdf(element).toBlob();
}
