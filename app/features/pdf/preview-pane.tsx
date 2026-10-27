import { toast } from "sonner";

import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import type { Resume } from "~/features/resume/schema";
import { useI18n } from "~/i18n";
import { downloadBlob, slugify } from "~/lib/download";

import { PdfPreview } from "./pdf-preview";
import { renderResumePdf } from "./render.client";
import { TemplatePicker } from "./template-picker";
import { useResumePdf } from "./use-resume-pdf";

export function PreviewPane({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  const { blob, error } = useResumePdf(resume);

  return (
    <div className="grid gap-3">
      <TemplatePicker value={resume.template} />
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{t("pdfError")}</p>
      ) : null}
      <PdfPreview blob={blob} className="max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-lg bg-muted/40 p-3" />
    </div>
  );
}

export async function downloadResumePdf(resume: Resume) {
  const blob = await renderResumePdf(resume);
  downloadBlob(blob, `${slugify(resume.basics.name || resume.title)}.pdf`);
}

export function ExportPdfItem({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  return (
    <DropdownMenuItem onSelect={() => downloadResumePdf(resume).catch(() => toast.error(t("pdfError")))}>
      {t("exportPdf")}
    </DropdownMenuItem>
  );
}
