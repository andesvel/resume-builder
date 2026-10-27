import { useEffect } from "react";
import { data, isRouteErrorResponse, Link, NavLink, useSearchParams } from "react-router";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AssistantPanel } from "~/features/ai/assistant-panel";
import { CoverLetterEditor } from "~/features/cover-letter/cover-letter-editor";
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
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-2">
        <Skeleton className="h-[70vh]" />
        <Skeleton className="hidden h-[70vh] lg:block" />
      </main>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useI18n();
  if (!isRouteErrorResponse(error)) throw error;
  return (
    <>
      <main className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-20 text-center">
        <p className="text-muted-foreground">{t("editor.notFound")}</p>
        <Button asChild variant="outline">
          <Link to="/" viewTransition>{t("common.back")}</Link>
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
  const [params] = useSearchParams();
  const view = params.get("view") === "letter" ? "letter" : "resume";

  useEffect(() => {
    load(loaderData.resume);
    return startAutosave();
  }, [loaderData.resume, load]);

  if (!resume || resume.id !== loaderData.resume.id) return <HydrateFallback />;

  const preview = <PreviewPane resume={resume} kind={view} />;
  const content =
    view === "letter" ? (
      <CoverLetterEditor resume={resume} />
    ) : (
      <div className="grid content-start gap-4">
        <AssistantPanel />
        <ResumeEditor resume={resume} />
      </div>
    );

  return (
    <>
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4">
        <EditorToolbar resume={resume} exportItems={<ExportPdfItem resume={resume} />} />
        <ViewSwitch view={view} />
        {wide ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
            {content}
            <div className="sticky top-24 self-start">{preview}</div>
          </div>
        ) : (
          <Tabs defaultValue="content">
            <TabsList className="w-full">
              <TabsTrigger value="content">{t("editor.content")}</TabsTrigger>
              <TabsTrigger value="preview">{t("editor.preview")}</TabsTrigger>
            </TabsList>
            <TabsContent value="content">{content}</TabsContent>
            <TabsContent value="preview">{preview}</TabsContent>
          </Tabs>
        )}
      </main>
    </>
  );
}

function ViewSwitch({ view }: { view: "resume" | "letter" }) {
  const { t } = useI18n();
  const item = (to: string, active: boolean, label: string) => (
    <NavLink
      to={to}
      replace
      viewTransition
      className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </NavLink>
  );
  return (
    <nav className="flex gap-4 border-b">
      {item("?", view === "resume", t("letter.resumeTab"))}
      {item("?view=letter", view === "letter", t("letter.tab"))}
    </nav>
  );
}
