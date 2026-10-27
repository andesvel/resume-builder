import { useEffect, useState } from "react";

import type { Resume } from "~/features/resume/schema";

import { renderResumePdf } from "./render";

/** Re-render the PDF shortly after the resume stops changing. */
export function useResumePdf(resume: Resume, delay = 350) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      renderResumePdf(resume)
        .then((b) => !cancelled && (setBlob(b), setError(null)))
        .catch((e: unknown) => !cancelled && setError(e));
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resume, delay]);

  return { blob, error };
}
