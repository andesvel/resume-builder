import { DateField, LinesField, TextAreaField, TextField } from "../fields";
import { EntryList } from "../entry-list";
import { useI18n } from "~/i18n";
import { certificationSchema, projectSchema, type Certification, type Project } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";

export function ProjectsSection({ items }: { items: Project[] }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  return (
    <EntryList
      items={items}
      onChange={(next) => update((d) => void (d.projects = next))}
      create={() => projectSchema.parse({})}
      summarize={(p) => p.name}
    >
      {(p, patch) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t("fields.projectName")} value={p.name} onChange={(name) => patch({ name })} />
            <TextField label={t("fields.url")} type="url" value={p.url} onChange={(url) => patch({ url })} />
          </div>
          <TextAreaField label={t("fields.description")} rows={2} value={p.description} onChange={(description) => patch({ description })} />
          <LinesField label={t("fields.highlights")} value={p.highlights} onChange={(highlights) => patch({ highlights })} />
        </>
      )}
    </EntryList>
  );
}

export function CertificationsSection({ items }: { items: Certification[] }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  return (
    <EntryList
      items={items}
      onChange={(next) => update((d) => void (d.certifications = next))}
      create={() => certificationSchema.parse({})}
      summarize={(c) => [c.name, c.issuer].filter(Boolean).join(" · ")}
    >
      {(c, patch) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t("fields.certName")} value={c.name} onChange={(name) => patch({ name })} />
          <TextField label={t("fields.issuer")} value={c.issuer} onChange={(issuer) => patch({ issuer })} />
          <DateField label={t("fields.date")} value={c.date} onChange={(date) => patch({ date })} />
          <TextField label={t("fields.url")} type="url" value={c.url} onChange={(url) => patch({ url })} />
        </div>
      )}
    </EntryList>
  );
}
