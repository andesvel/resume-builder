import { ChevronDownIcon, CopyIcon, FileUpIcon, MoreHorizontalIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";
import { toast } from "sonner";

import { SiteHeader } from "~/components/layout/site-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { Features } from "~/features/landing/features";
import { SamplePreview } from "~/features/landing/sample-preview";
import { cloneResume, createResume, createSampleResume } from "~/features/resume/factory";
import { getResumeRepository } from "~/features/resume/repository";
import type { Resume, ResumeMeta } from "~/features/resume/schema";
import { TEXT_FILE_ACCEPT } from "~/features/import/accept";
import { setPendingImport } from "~/features/import/pending";
import { importResumeJson } from "~/features/resume/transfer";
import { useI18n } from "~/i18n";

import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "Resume Builder" },
    { name: "description", content: "Local-first resume builder with in-browser AI." },
  ];
}

export async function clientLoader() {
  return { resumes: await getResumeRepository().list() };
}

export function HydrateFallback() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-3 px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </main>
    </>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const jsonInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<ResumeMeta | null>(null);
  const repo = getResumeRepository();

  const create = async (resume: Resume) => {
    await repo.save(resume);
    navigate(`/r/${resume.id}`);
  };

  const duplicate = async (id: string) => {
    const original = await repo.get(id);
    if (!original) return;
    await repo.save(cloneResume(original, { title: `${original.title} (2)` }));
    revalidate();
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

  const fileInput = (ref: React.RefObject<HTMLInputElement | null>, accept: string, onFile: (f: File | undefined) => void) => (
    <input
      ref={ref}
      type="file"
      accept={accept}
      hidden
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-16 px-4 py-12 sm:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid gap-6">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("landing.title")}</h1>
            <p className="max-w-prose text-lg text-pretty text-muted-foreground">{t("landing.subtitle")}</p>
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
          {fileInput(docInput, TEXT_FILE_ACCEPT, (f) => void onImportDocument(f))}
          {fileInput(zipInput, ".zip,application/zip", (f) => void onImportLinkedIn(f))}
          {fileInput(jsonInput, "application/json,.json", (f) => void onImportJson(f))}
        </div>
          </div>
          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <SamplePreview />
          </div>
        </section>

        {loaderData.resumes.length > 0 ? (
          <section aria-labelledby="resumes-title" className="grid gap-4">
          <h2 id="resumes-title" className="text-2xl font-semibold tracking-tight">{t("home.title")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {loaderData.resumes.map((r) => (
              <li key={r.id}>
                <Card className="relative transition-colors hover:bg-accent/40">
                  <CardHeader>
                    <CardTitle>
                      <Link to={`/r/${r.id}`} className="after:absolute after:inset-0">
                        {r.title || t("home.untitled")}
                      </Link>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      {r.name && <span>{r.name}</span>}
                      <Badge variant="outline" className="uppercase">{r.locale}</Badge>
                      <span>{t("home.updated", { date: dateFormat.format(new Date(r.updatedAt)) })}</span>
                    </CardDescription>
                    <CardAction className="relative z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={t("home.actions")}>
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => duplicate(r.id)}>
                            <CopyIcon /> {t("home.duplicate")}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(r)}>
                            <Trash2Icon /> {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardAction>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
          </section>
        ) : null}

        <Features />
      </main>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("home.deleteBody", { title: pendingDelete?.title ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (pendingDelete) await repo.delete(pendingDelete.id);
                setPendingDelete(null);
                revalidate();
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
