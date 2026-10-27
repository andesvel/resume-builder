import { CopyIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link, useRevalidator } from "react-router";

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
import { CreateActions } from "~/features/home/create-actions";
import { cloneResume } from "~/features/resume/factory";
import { getResumeRepository } from "~/features/resume/repository";
import type { ResumeMeta } from "~/features/resume/schema";
import { getT, useI18n } from "~/i18n";
import { rootData, seo } from "~/lib/seo";

import type { Route } from "./+types/resumes";

export function meta({ matches }: Route.MetaArgs) {
  const root = rootData(matches);
  const t = getT(root.locale);
  return seo({ title: t("seo.resumesTitle"), description: t("seo.privateDescription"), path: "/resumes", root, noindex: true });
}

export async function clientLoader() {
  return { resumes: await getResumeRepository().list() };
}

export function HydrateFallback() {
  return (
    <main className="mx-auto grid max-w-5xl gap-3 px-4 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </main>
  );
}

export default function Resumes({ loaderData }: Route.ComponentProps) {
  const { t, locale } = useI18n();
  const { revalidate } = useRevalidator();
  const [pendingDelete, setPendingDelete] = useState<ResumeMeta | null>(null);
  const repo = getResumeRepository();
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const duplicate = async (id: string) => {
    const original = await repo.get(id);
    if (!original) return;
    await repo.save(cloneResume(original, { title: `${original.title} (2)` }));
    revalidate();
  };

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10">
      <div className="grid gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t("home.title")}</h1>
        <CreateActions />
      </div>

      {loaderData.resumes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("home.empty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {loaderData.resumes.map((r) => (
            <li key={r.id}>
              <Card className="relative transition-colors hover:bg-accent/40">
                <CardHeader>
                  <CardTitle>
                    <Link to={`/r/${r.id}`} viewTransition className="after:absolute after:inset-0">
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
      )}

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
    </main>
  );
}
