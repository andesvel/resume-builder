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
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{t("pdfError")}</p>
      ) : null}
      <PdfPreview blob={blob} className="max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-lg bg-muted/40 p-3" />
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
