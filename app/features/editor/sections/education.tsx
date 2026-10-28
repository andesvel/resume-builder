import { DateField, TextField } from "../fields";
import { EntryList } from "../entry-list";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { useI18n } from "~/i18n";
import { educationSchema, type Education } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";

export function EducationSection({ items }: { items: Education[] }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  return (
    <EntryList
      items={items}
      onChange={(next) => update((d) => void (d.education = next))}
      create={() => educationSchema.parse({})}
      summarize={(e) => [e.degree, e.institution].filter(Boolean).join(" · ")}
    >
      {(e, patch) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t("fields.institution")} value={e.institution} onChange={(institution) => patch({ institution })} className="sm:col-span-2" />
            <TextField label={t("fields.degree")} value={e.degree} onChange={(degree) => patch({ degree })} />
            <TextField label={t("fields.field")} value={e.field} onChange={(field) => patch({ field })} />
            <DateField label={t("fields.startDate")} value={e.startDate} onChange={(startDate) => patch({ startDate })} />
            <DateField label={t("fields.endDate")} value={e.endDate} disabled={e.current} onChange={(endDate) => patch({ endDate })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`studying-${e.id}`} checked={e.current} onCheckedChange={(current) => patch({ current, ...(current ? { endDate: "" } : {}) })} />
            <Label htmlFor={`studying-${e.id}`}>{t("editor.studying")}</Label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t("fields.gpa")} value={e.gpa} onChange={(gpa) => patch({ gpa })} />
            <TextField label={t("fields.honors")} value={e.honors} onChange={(honors) => patch({ honors })} />
          </div>
        </>
      )}
    </EntryList>
  );
}
