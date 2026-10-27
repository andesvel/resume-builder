import { templateIds, type TemplateId } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

export function TemplatePicker({ value }: { value: TemplateId }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  return (
    <div role="radiogroup" aria-label={t("templates.label")} className="inline-flex rounded-lg border p-0.5">
      {templateIds.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-description={t(`templates.${id}Description`)}
          onClick={() => update((d) => void (d.template = id), { checkpoint: true })}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`templates.${id}`)}
        </button>
      ))}
    </div>
  );
}
