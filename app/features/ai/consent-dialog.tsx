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
import { useI18n } from "~/i18n";

import { tagModels, variantFor } from "./models";
import { useAi } from "./store";

export function ConsentDialog({ open, onOpenChange, onAccept }: { open: boolean; onOpenChange: (open: boolean) => void; onAccept: () => void }) {
  const { t } = useI18n();
  // Select a primitive: resolve() returns a fresh object and would loop the store subscription.
  const engine = useAi((s) => s.resolve()?.engine);
  const device = useAi((s) => s.device);
  const key = useAi((s) => s.activeModel());
  const model = device && key ? variantFor(key, device) : null;
  const size = model ? `${(model.sizeMB / 1024).toFixed(1)} GB` : "";
  const heavy = device && key ? tagModels(device, useAi.getState().cachedModels)[key].some((tag) => tag === "heavy" || tag === "tooHeavy") : false;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("assistant.consentTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {engine === "chrome"
              ? t("assistant.consentBodyChrome")
              : t("assistant.consentBodyWebLlm", { model: model?.name ?? "", size })}
          </AlertDialogDescription>
          {engine === "webllm" && heavy ? (
            <p className="rounded-md bg-amber-500/10 p-2 text-sm text-amber-800 dark:text-amber-300">{t("assistant.consentHeavy")}</p>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>{t("assistant.consentAccept")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
