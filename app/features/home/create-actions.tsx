import { ChevronDownIcon, FileUpIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { TEXT_FILE_ACCEPT } from "~/features/import/accept";
import { setPendingImport } from "~/features/import/pending";
import { createResume, createSampleResume } from "~/features/resume/factory";
import { getResumeRepository } from "~/features/resume/repository";
import type { Resume } from "~/features/resume/schema";
import { importResumeJson } from "~/features/resume/transfer";
import { useI18n } from "~/i18n";

function FileInput({ inputRef, accept, onFile }: { inputRef: React.RefObject<HTMLInputElement | null>; accept: string; onFile: (file: File | undefined) => void }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      hidden
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );
}

/** New, sample and import actions; each ends in the editor of the created resume. */
export function CreateActions() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const jsonInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const create = async (resume: Resume) => {
    await getResumeRepository().save(resume);
    navigate(`/r/${resume.id}`, { viewTransition: true });
  };

  const onImportJson = async (file: File | undefined) => {
    if (!file) return;
    const resume = await importResumeJson(file);
    if (resume) await create(resume);
    else toast.error(t("home.importError"));
  };

  const onImportLinkedIn = async (file: File | undefined) => {
    if (!file) return;
    const { resumeFromLinkedInZip } = await import("~/features/import/linkedin");
    const resume = await file.arrayBuffer().then((b) => resumeFromLinkedInZip(new Uint8Array(b), locale)).catch(() => null);
    if (resume) await create(resume);
    else toast.error(t("home.importLinkedInError"));
  };

  /** PDF/Word goes through the assistant so the user can review the text before the AI reads it. */
  const onImportDocument = async (file: File | undefined) => {
    if (!file) return;
    const { textFromFile } = await import("~/features/import/text-from-file.client");
    const text = await textFromFile(file).catch(() => "");
    if (!text) return void toast.error(t("home.importDocumentEmpty"));
    const resume = createResume({ title: file.name.replace(/\.[^.]+$/, ""), locale });
    setPendingImport(resume.id, text);
    await create(resume);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => create(createResume({ title: t("home.untitled"), locale }))}>
        <PlusIcon /> {t("home.new")}
      </Button>
      <Button variant="outline" onClick={() => create(createSampleResume(locale))}>
        <SparklesIcon /> {t("home.sample")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FileUpIcon /> {t("home.importMenu")} <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuItem onSelect={() => docInput.current?.click()} className="flex-col items-start gap-0">
            {t("home.importDocument")}
            <span className="text-xs text-muted-foreground">{t("home.importDocumentHint")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => zipInput.current?.click()} className="flex-col items-start gap-0">
            {t("home.importLinkedIn")}
            <span className="text-xs text-muted-foreground">{t("home.importLinkedInHint")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => jsonInput.current?.click()} className="flex-col items-start gap-0">
            {t("home.importJson")}
            <span className="text-xs text-muted-foreground">{t("home.importJsonHint")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FileInput inputRef={docInput} accept={TEXT_FILE_ACCEPT} onFile={(f) => void onImportDocument(f)} />
      <FileInput inputRef={zipInput} accept=".zip,application/zip" onFile={(f) => void onImportLinkedIn(f)} />
      <FileInput inputRef={jsonInput} accept="application/json,.json" onFile={(f) => void onImportJson(f)} />
    </div>
  );
}
