import { useEffect, useState } from "react";

import type { Resume } from "~/features/resume/schema";

import { renderCoverLetterPdf, renderResumePdf } from "./render.client";

const renderers = { resume: renderResumePdf, letter: renderCoverLetterPdf };

/** Re-render the PDF shortly after the resume stops changing. */
export function useResumePdf(resume: Resume, kind: keyof typeof renderers = "resume", delay = 350) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      renderers[kind](resume)
        .then((b) => !cancelled && (setBlob(b), setError(null)))
        .catch((e: unknown) => !cancelled && setError(e));
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resume, kind, delay]);

  return { blob, error };
}
