import { LoaderIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { ConsentDialog } from "~/features/ai/consent-dialog";
import { useLocalAi } from "~/features/ai/use-local-ai";
import { TextAreaField, TextField } from "~/features/editor/fields";
import type { CoverLetter, Resume } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";
import { useI18n } from "~/i18n";

import { draftCoverLetter } from "./draft";

export function CoverLetterEditor({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  const { getEngine, consent, supported } = useLocalAi();
  const [drafting, setDrafting] = useState(false);
  const letter = resume.coverLetter;
  const set = <K extends keyof CoverLetter>(key: K) => (value: CoverLetter[K]) => update((d) => void (d.coverLetter[key] = value));

  const draft = async () => {
    setDrafting(true);
    try {
      const engine = await getEngine();
      const current = useEditor.getState().resume ?? resume;
      const body = await draftCoverLetter(engine, current);
      if (!body) throw new Error("empty draft");
      update((d) => void (d.coverLetter.body = body), { checkpoint: true });
      // Replacing is safe: the previous letter is one undo away.
      toast.success(t("letter.drafted"), {
        action: { label: t("common.undo"), onClick: () => useEditor.getState().undo() },
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(t("letter.error"));
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="grid content-start gap-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label={t("letter.recipient")} placeholder={t("letter.recipientPlaceholder")} value={letter.recipient} onChange={set("recipient")} />
        <TextField label={t("letter.company")} value={letter.company} onChange={set("company")} />
        <TextField label={t("letter.role")} value={letter.role} onChange={set("role")} />
      </div>
      <TextAreaField label={t("letter.jobDescription")} placeholder={t("letter.jobDescriptionPlaceholder")} rows={4} value={letter.jobDescription} onChange={set("jobDescription")} />
      <TextAreaField label={t("letter.body")} placeholder={t("letter.bodyPlaceholder")} rows={14} value={letter.body} onChange={set("body")} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("letter.hint")}</p>
        {supported !== false && (
          <Button size="sm" variant="outline" onClick={draft} disabled={drafting || supported === null}>
            {drafting ? <LoaderIcon className="animate-spin" /> : <SparklesIcon />}
            {drafting ? t("letter.drafting") : t("letter.draft")}
          </Button>
        )}
      </div>
      <ConsentDialog {...consent} />
    </div>
  );
}
