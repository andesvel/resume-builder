import { useEffect } from "react";
import { data, Link } from "react-router";

import { SiteHeader } from "~/components/layout/site-header";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { EditorToolbar } from "~/features/editor/editor-toolbar";
import { ExportPdfItem, PreviewPane } from "~/features/pdf/preview-pane";
import { ResumeEditor } from "~/features/editor/resume-editor";
import { getResumeRepository } from "~/features/resume/repository";
import { startAutosave, useEditor } from "~/features/resume/store";
import { useI18n } from "~/i18n";
import { useMediaQuery } from "~/lib/use-media-query";

import type { Route } from "./+types/editor";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const resume = await getResumeRepository().get(params.id);
  if (!resume) throw data(null, { status: 404 });
  return { resume };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.resume.title ?? "Editor"} · Resume Builder` }];
}

export function HydrateFallback() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-2">
        <Skeleton className="h-[70vh]" />
        <Skeleton className="hidden h-[70vh] lg:block" />
      </main>
    </>
  );
}

export function ErrorBoundary() {
  const { t } = useI18n();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-20 text-center">
        <p className="text-muted-foreground">{t("editor.notFound")}</p>
        <Button asChild variant="outline">
          <Link to="/">{t("common.back")}</Link>
        </Button>
      </main>
    </>
  );
}

export default function EditorRoute({ loaderData }: Route.ComponentProps) {
  const { t } = useI18n();
  const resume = useEditor((s) => s.resume);
  const load = useEditor((s) => s.load);
  const wide = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    load(loaderData.resume);
    return startAutosave();
  }, [loaderData.resume, load]);

  if (!resume || resume.id !== loaderData.resume.id) return <HydrateFallback />;

  const preview = <PreviewPane resume={resume} />;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4">
        <EditorToolbar resume={resume} exportItems={<ExportPdfItem resume={resume} />} />
        {wide ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
            <ResumeEditor resume={resume} />
            <div className="sticky top-20 self-start">{preview}</div>
          </div>
        ) : (
          <Tabs defaultValue="content">
            <TabsList className="w-full">
              <TabsTrigger value="content">{t("editor.content")}</TabsTrigger>
              <TabsTrigger value="preview">{t("editor.preview")}</TabsTrigger>
            </TabsList>
            <TabsContent value="content">
              <ResumeEditor resume={resume} />
            </TabsContent>
            <TabsContent value="preview">{preview}</TabsContent>
          </Tabs>
        )}
      </main>
    </>
  );
}
