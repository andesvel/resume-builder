import { CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import type { Resume } from "~/features/resume/schema";
import { useI18n } from "~/i18n";
import { downloadBlob, slugify } from "~/lib/download";

import { FontPicker } from "./font-picker";
import { PdfPreview } from "./pdf-preview";
import { renderCoverLetterPdf, renderResumePdf } from "./render.client";
import { TemplatePicker } from "./template-picker";
import { TonePicker } from "./tone-picker";
import { useResumePdf } from "./use-resume-pdf";

export function PreviewPane({ resume, kind = "resume" }: { resume: Resume; kind?: "resume" | "letter" }) {
  const { t } = useI18n();
  const { blob, error } = useResumePdf(resume, kind);

  return (
    <div className="grid gap-3">
      {kind === "resume" ? (
        <div className="flex flex-wrap items-center gap-2">
          <TemplatePicker value={resume.template} />
          <FontPicker resume={resume} />
          {resume.template === "modern" ? <TonePicker resume={resume} /> : null}
        </div>
      ) : null}
      {error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
          {t("pdfError")}
        </p>
      ) : null}
      <PdfPreview blob={blob} className="max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-lg bg-muted/40 p-3" />
    </div>
  );
}

export async function downloadResumePdf(resume: Resume) {
  const blob = await renderResumePdf(resume);
  downloadBlob(blob, `${slugify(resume.basics.name || resume.title)}.pdf`);
}

async function downloadCoverLetterPdf(resume: Resume) {
  const blob = await renderCoverLetterPdf(resume);
  downloadBlob(blob, `${slugify(resume.basics.name || resume.title)}-cover-letter.pdf`);
}

export function ExportPdfItem({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  const fail = () => toast.error(t("pdfError"));
  return (
    <>
      <DropdownMenuItem onSelect={() => downloadResumePdf(resume).catch(fail)}>{t("exportPdf")}</DropdownMenuItem>
      <DropdownMenuItem disabled={!resume.coverLetter.body.trim()} onSelect={() => downloadCoverLetterPdf(resume).catch(fail)}>
        {t("letter.exportPdf")}
      </DropdownMenuItem>
    </>
  );
}
