import { CheckIcon } from "lucide-react";

import type { Resume } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";
import { sidebarTones, toneIds } from "~/features/resume/tones";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

export function TonePicker({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  return (
    <div role="radiogroup" aria-label={t("templates.sidebarTone")} className="flex items-center gap-1">
      {toneIds.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={resume.sidebarTone === id}
          aria-label={t(`templates.tones.${id}`)}
          title={t(`templates.tones.${id}`)}
          onClick={() => update((d) => void (d.sidebarTone = id), { checkpoint: true })}
          style={{ backgroundColor: sidebarTones[id] }}
          className={cn(
            "grid size-6 place-items-center rounded-full border border-black/10 text-neutral-900 transition-shadow",
            resume.sidebarTone === id && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          )}
        >
          {resume.sidebarTone === id ? <CheckIcon className="size-3" /> : null}
        </button>
      ))}
    </div>
  );
}
