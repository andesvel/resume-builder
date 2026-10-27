import { DateField, LinesField, TextField } from "../fields";
import { EntryList } from "../entry-list";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { useI18n } from "~/i18n";
import { experienceSchema, type Experience } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";

export function ExperienceSection({ items }: { items: Experience[] }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  return (
    <EntryList
      items={items}
      onChange={(next) => update((d) => void (d.experience = next))}
      create={() => experienceSchema.parse({})}
      summarize={(e) => [e.role, e.company].filter(Boolean).join(" · ")}
    >
      {(e, patch) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t("fields.role")} value={e.role} onChange={(role) => patch({ role })} />
            <TextField label={t("fields.company")} value={e.company} onChange={(company) => patch({ company })} />
            <TextField label={t("fields.location")} value={e.location} onChange={(location) => patch({ location })} className="sm:col-span-2" />
            <DateField label={t("fields.startDate")} value={e.startDate} onChange={(startDate) => patch({ startDate })} />
            <DateField label={t("fields.endDate")} value={e.endDate} disabled={e.current} onChange={(endDate) => patch({ endDate })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`current-${e.id}`} checked={e.current} onCheckedChange={(current) => patch({ current, ...(current ? { endDate: "" } : {}) })} />
            <Label htmlFor={`current-${e.id}`}>{t("editor.current")}</Label>
          </div>
          <LinesField label={t("fields.highlights")} value={e.highlights} onChange={(highlights) => patch({ highlights })} />
        </>
      )}
    </EntryList>
  );
}
