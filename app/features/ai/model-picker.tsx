import { CpuIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useI18n } from "~/i18n";

import { webLlmModels, type WebLlmModelId } from "./models";
import { useAi } from "./store";

/** Pick the local backend: automatic, Gemini Nano (Chrome) or a WebLLM model. */
export function ModelPicker() {
  const { t } = useI18n();
  const availability = useAi((s) => s.availability);
  const preference = useAi((s) => s.preference);
  const model = useAi((s) => s.webLlmModel);
  const setPreference = useAi((s) => s.setPreference);
  const value = preference === "webllm" ? model : preference;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("assistant.modelChoice")}>
          <CpuIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>{t("assistant.modelChoice")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => {
            if (v === "auto" || v === "chrome") setPreference(v);
            else setPreference("webllm", v as WebLlmModelId);
          }}
        >
          <DropdownMenuRadioItem value="auto">{t("assistant.modelAuto")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="chrome" disabled={availability?.chrome === "unsupported"}>
            Gemini Nano (Chrome)
          </DropdownMenuRadioItem>
          {webLlmModels.map((m) => (
            <DropdownMenuRadioItem key={m.id} value={m.id} disabled={availability?.webllm === "unsupported"}>
              {m.name} · {(m.sizeMB / 1024).toFixed(1)} GB
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
