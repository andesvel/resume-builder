import { CheckIcon, LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { data, Link, useNavigate } from "react-router";

import { SiteHeader } from "~/components/layout/site-header";
import { Button } from "~/components/ui/button";
import { getResumeRepository } from "~/features/resume/repository";
import { useI18n } from "~/i18n";
import { cloudflareContext } from "~/lib/cloudflare";
import { draftStore } from "~/mcp/draft-store.server";

import type { Route } from "./+types/import";

export function meta() {
  return [{ title: "Import · Resume Builder" }, { name: "robots", content: "noindex" }];
}

/** A draft written by an agent over MCP, handed to this browser. */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const resume = await draftStore(env).get(params.id);
  if (!resume) throw data(null, { status: 404 });
  return { resume };
}

type State = "checking" | "conflict" | "saved";

export default function ImportRoute({ loaderData }: Route.ComponentProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { resume } = loaderData;
  const [state, setState] = useState<State>("checking");

  const save = async () => {
    await getResumeRepository().save(resume);
    setState("saved");
    navigate(`/r/${resume.id}`, { replace: true, viewTransition: true });
  };

  useEffect(() => {
    // Re-importing the same draft updates the local copy, unless that copy was edited later.
    void getResumeRepository()
      .get(resume.id)
      .then((local) => (local && local.updatedAt > resume.updatedAt ? setState("conflict") : save()));
  }, [resume]); // Runs once per draft.

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-20 text-center">
        {state === "conflict" ? (
          <>
            <p className="font-medium">{t("mcp.conflictTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("mcp.conflictBody", { title: resume.title })}</p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to={`/r/${resume.id}`}>{t("mcp.keepLocal")}</Link>
              </Button>
              <Button onClick={save}>{t("mcp.useAgent")}</Button>
            </div>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {state === "saved" ? <CheckIcon className="size-4" /> : <LoaderIcon className="size-4 animate-spin" />}
            {t("mcp.importing", { title: resume.title })}
          </p>
        )}
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
        <p className="text-muted-foreground">{t("mcp.notFound")}</p>
        <Button asChild variant="outline">
          <Link to="/">{t("common.back")}</Link>
        </Button>
      </main>
    </>
  );
}
