import { EntryList } from "../entry-list";
import { TextAreaField, TextField } from "../fields";
import { useI18n } from "~/i18n";
import { useEditor } from "~/features/resume/store";
import { linkSchema, type Basics } from "~/features/resume/schema";

export function BasicsSection({ basics }: { basics: Basics }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  const set = <K extends keyof Basics>(key: K) => (value: Basics[K]) => update((d) => void (d.basics[key] = value));

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t("fields.name")} value={basics.name} onChange={set("name")} />
        <TextField label={t("fields.headline")} placeholder={t("fields.headlinePlaceholder")} value={basics.headline} onChange={set("headline")} />
        <TextField label={t("fields.email")} type="email" value={basics.email} onChange={set("email")} />
        <TextField label={t("fields.phone")} type="tel" value={basics.phone} onChange={set("phone")} />
        <TextField label={t("fields.location")} value={basics.location} onChange={set("location")} className="sm:col-span-2" />
      </div>
      <p className="text-sm font-medium">{t("fields.links")}</p>
      <EntryList items={basics.links} onChange={set("links")} create={() => linkSchema.parse({})} summarize={(l) => l.label || l.url}>
        {(link, patch) => (
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <TextField label={t("fields.linkLabel")} placeholder="GitHub" value={link.label} onChange={(label) => patch({ label })} />
            <TextField label={t("fields.linkUrl")} type="url" placeholder="github.com/you" value={link.url} onChange={(url) => patch({ url })} />
          </div>
        )}
      </EntryList>
    </div>
  );
}

export function SummarySection({ summary }: { summary: string }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  return <TextAreaField label={t("fields.summary")} rows={5} value={summary} onChange={(v) => update((d) => void (d.basics.summary = v))} />;
}
