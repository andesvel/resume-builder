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

import { webLlmModels } from "./models";
import { useAi } from "./store";

export function ConsentDialog({ open, onOpenChange, onAccept }: { open: boolean; onOpenChange: (open: boolean) => void; onAccept: () => void }) {
  const { t } = useI18n();
  // Select a primitive: resolve() returns a fresh object and would loop the store subscription.
  const engine = useAi((s) => s.resolve()?.engine);
  const modelId = useAi((s) => s.webLlmModel);
  const model = webLlmModels.find((m) => m.id === modelId);
  const size = model ? `${(model.sizeMB / 1024).toFixed(1)} GB` : "";

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
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>{t("assistant.consentAccept")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
