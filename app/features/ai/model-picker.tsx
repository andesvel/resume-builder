import { CpuIcon, TriangleAlertIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { type MessageKey, useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

import { isLimitedDevice, isModelKey, type ModelTag, recommendedModel, tagModels, variantFor, webLlmModels } from "./models";
import { useAi } from "./store";

const TAG_LABEL: Record<ModelTag, MessageKey> = {
  recommended: "assistant.modelRecommended",
  lightest: "assistant.modelLightest",
  heavy: "assistant.modelHeavy",
  tooHeavy: "assistant.modelTooHeavy",
  noSpace: "assistant.modelNoSpace",
};

const TAG_STYLE: Record<ModelTag, string> = {
  recommended: "text-emerald-700 dark:text-emerald-400",
  lightest: "",
  heavy: "text-amber-700 dark:text-amber-400",
  tooHeavy: "text-red-700 dark:text-red-400",
  noSpace: "text-red-700 dark:text-red-400",
};

const gb = (mb: number) => `${(mb / 1024).toFixed(1)} GB`;

/** Pick the local backend: automatic, Gemini Nano (Chrome) or a WebLLM model, labelled for this device. */
export function ModelPicker() {
  const { t } = useI18n();
  const availability = useAi((s) => s.availability);
  const device = useAi((s) => s.device);
  const preference = useAi((s) => s.preference);
  const model = useAi((s) => s.webLlmModel);
  const setPreference = useAi((s) => s.setPreference);
  const value = preference === "webllm" && model ? model : preference;
  const cached = useAi((s) => s.cachedModels);
  const tags = device ? tagModels(device, cached) : null;
  const webllmOff = availability?.webllm === "unsupported";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("assistant.modelChoice")}>
          <CpuIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t("assistant.modelChoice")}</DropdownMenuLabel>
        {device && isLimitedDevice(device) ? (
          <p className="mx-2 mb-1 flex gap-2 text-xs text-muted-foreground">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            {t("assistant.limitedBody")}
          </p>
        ) : null}
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => {
            if (v === "auto") setPreference("auto", null);
            else if (v === "chrome") setPreference("chrome");
            else if (isModelKey(v)) setPreference("webllm", v);
          }}
        >
          <DropdownMenuRadioItem value="auto" className="flex-col items-start gap-0">
            {t("assistant.modelAuto")}
            {device ? (
              <span className="text-xs text-muted-foreground">
                {t("assistant.modelAutoHint", { model: variantFor(recommendedModel(device, cached), device).name })}
              </span>
            ) : null}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="chrome" disabled={availability?.chrome === "unsupported"}>
            Gemini Nano (Chrome)
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {webLlmModels.map((m) => {
            const variant = device ? variantFor(m.key, device) : null;
            return (
              <DropdownMenuRadioItem key={m.key} value={m.key} disabled={webllmOff || tags?.[m.key].includes("noSpace")} className="flex-col items-start gap-1">
                <span>
                  {m.name}
                  {variant ? <span className="text-muted-foreground"> · {gb(variant.sizeMB)}</span> : null}
                </span>
                {tags?.[m.key].length ? (
                  <span className="flex flex-wrap gap-1">
                    {tags[m.key].map((tag) => (
                      <Badge key={tag} variant="outline" className={cn("h-4 px-1.5 text-[10px] font-normal", TAG_STYLE[tag])}>
                        {t(TAG_LABEL[tag])}
                      </Badge>
                    ))}
                  </span>
                ) : null}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
