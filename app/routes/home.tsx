import { CopyIcon, FileUpIcon, MoreHorizontalIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
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
import { cloneResume, createResume, createSampleResume } from "~/features/resume/factory";
import { getResumeRepository } from "~/features/resume/repository";
import type { Resume, ResumeMeta } from "~/features/resume/schema";
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
  const fileInput = useRef<HTMLInputElement>(null);
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

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const resume = await importResumeJson(file);
    if (resume) await create(resume);
    else toast.error(t("home.importError"));
  };

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10">
        <section className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("home.title")}</h1>
          <p className="text-muted-foreground">{t("app.tagline")}</p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => create(createResume({ title: t("home.untitled"), locale }))}>
            <PlusIcon /> {t("home.new")}
          </Button>
          <Button variant="outline" onClick={() => create(createSampleResume(locale))}>
            <SparklesIcon /> {t("home.sample")}
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <FileUpIcon /> {t("home.importJson")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void onImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {loaderData.resumes.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{t("home.empty")}</p>
        ) : (
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
                          <Button variant="ghost" size="icon-sm" aria-label="Actions">
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
        )}
        <p className="text-xs text-muted-foreground">{t("home.localOnly")}</p>
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
