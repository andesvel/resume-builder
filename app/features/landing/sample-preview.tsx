import { useEffect, useState } from "react";

import { PdfPreview } from "~/features/pdf/pdf-preview";
import { createSampleResume } from "~/features/resume/factory";
import { useI18n } from "~/i18n";

/** The real sample resume, rendered by the same engine as exports. */
export function SamplePreview() {
  const { locale, t } = useI18n();
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("~/features/pdf/render.client")
      .then(({ renderResumePdf }) => renderResumePdf(createSampleResume(locale)))
      .then((b) => !cancelled && setBlob(b));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <figure aria-label={t("landing.previewAlt")} className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border bg-white shadow-sm">
      <PdfPreview blob={blob} className="[&_canvas]:rounded-none [&_canvas]:shadow-none [&_canvas]:ring-0" />
    </figure>
  );
}
