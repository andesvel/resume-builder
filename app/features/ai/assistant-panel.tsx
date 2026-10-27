import { CircleHelpIcon, CpuIcon, LoaderIcon, PaperclipIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Progress } from "~/components/ui/progress";
import { Textarea } from "~/components/ui/textarea";
import { takePendingImport } from "~/features/import/pending";
import { TEXT_FILE_ACCEPT } from "~/features/import/accept";
import { useEditor } from "~/features/resume/store";
import { useI18n } from "~/i18n";

import { ConsentDialog } from "./consent-dialog";
import { applyFreeText } from "./extract";
import { isEmptySummary } from "./merge";
import { ModelPicker } from "./model-picker";
import { describeSummary } from "./summary";
import { useLocalAi } from "./use-local-ai";

function Tips() {
  const { t } = useI18n();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("assistant.tipsTitle")}>
          <CircleHelpIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <p className="mb-2 font-medium">{t("assistant.tipsTitle")}</p>
        <ul className="grid list-disc gap-1 pl-4 text-muted-foreground">
          {(["tip1", "tip2", "tip3", "tip4", "tip5"] as const).map((k) => (
            <li key={k}>{t(`assistant.${k}`)}</li>
          ))}
        </ul>
        <p className="mt-3 mb-1 font-medium">{t("assistant.exampleLabel")}</p>
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{t("assistant.example")}</p>
      </PopoverContent>
    </Popover>
  );
}

/**
 * One-shot natural language input (not a chat): each submission is extracted
 * by the local model and merged into the resume, then the box clears.
 */
export function AssistantPanel() {
  const { t } = useI18n();
  const { getEngine, consent, status, supported } = useLocalAi();
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<[number, number] | null>(null);
  const resumeId = useEditor((s) => s.resume?.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const loadText = (value: string, source: string) => {
    setText((current) => (current.trim() ? `${current.trim()}\n\n${value}` : value));
    textarea.current?.focus();
    toast.info(t("assistant.attached", { file: source }));
  };

  // Text handed over by an import on the home page.
  useEffect(() => {
    if (!resumeId) return;
    const pending = takePendingImport(resumeId);
    if (pending) loadText(pending, "PDF/Word");
  }, [resumeId]); // Once per resume; loadText is stable enough for this.

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const { textFromFile } = await import("~/features/import/text-from-file.client");
    const value = await textFromFile(file).catch(() => "");
    if (value) loadText(value, file.name);
    else toast.error(t("home.importDocumentEmpty"));
  };

  const submit = async () => {
    const input = text.trim();
    const resume = useEditor.getState().resume;
    if (!input || !resume || working) return;
    setWorking(true);
    try {
      const engine = await getEngine();
      const result = await applyFreeText(engine, useEditor.getState().resume ?? resume, input, {
        onStep: (done, total) => setStep([done, total]),
      });
      if (isEmptySummary(result.summary)) {
        toast.info(t("assistant.nothingFound"));
        return;
      }
      useEditor.getState().replace(result.resume);
      setText("");
      toast.success(t("assistant.applied"), {
        description: describeSummary(result.summary, t),
        action: { label: t("common.undo"), onClick: () => useEditor.getState().undo() },
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error(error);
        toast.error(t("assistant.error"));
      }
    } finally {
      setWorking(false);
      setStep(null);
    }
  };

  if (supported === false) {
    return (
      <Alert>
        <CpuIcon />
        <AlertTitle>{t("assistant.unsupportedTitle")}</AlertTitle>
        <AlertDescription>{t("assistant.unsupportedBody")}</AlertDescription>
      </Alert>
    );
  }

  const loading = status.kind === "loading" ? status.progress : null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4" /> {t("assistant.title")}
        </CardTitle>
        <CardDescription>{t("assistant.description")}</CardDescription>
        <CardAction className="flex gap-0.5">
          <ModelPicker />
          <Tips />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Textarea
          ref={textarea}
          rows={4}
          value={text}
          disabled={working}
          placeholder={t("assistant.placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        {loading && (
          <div className="grid gap-1">
            <Progress value={loading.progress === null ? undefined : loading.progress * 100} />
            <p className="text-xs text-muted-foreground">
              {t("assistant.loading", { percent: loading.progress === null ? "" : `${Math.round(loading.progress * 100)}%` })}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {status.kind === "ready" ? `${status.engine.label} · ` : ""}
          {t("assistant.local")}
        </p>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t("assistant.attach")} title={t("assistant.attach")} disabled={working} onClick={() => fileInput.current?.click()}>
            <PaperclipIcon />
          </Button>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={TEXT_FILE_ACCEPT}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button size="sm" onClick={submit} disabled={working || !text.trim() || supported === null}>
            {working ? <LoaderIcon className="animate-spin" /> : <SparklesIcon />}
            {working ? t("assistant.working") : t("assistant.submit")}
            {step && step[1] > 1 ? <span className="tabular-nums opacity-70">{Math.min(step[0] + 1, step[1])}/{step[1]}</span> : null}
          </Button>
        </div>
      </CardFooter>
      <ConsentDialog {...consent} />
    </Card>
  );
}
