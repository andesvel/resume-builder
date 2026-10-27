import { LinesField, TextField } from "../fields";
import { EntryList } from "../entry-list";
import { useI18n } from "~/i18n";
import { customEntrySchema, customSectionSchema, type CustomSection } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";

export function CustomSections({ items }: { items: CustomSection[] }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  return (
    <EntryList
      items={items}
      onChange={(next) => update((d) => void (d.custom = next))}
      create={() => customSectionSchema.parse({ title: t("fields.newSection") })}
      summarize={(s) => s.title}
      addLabel={t("fields.newSection")}
    >
      {(section, patchSection) => (
        <>
          <TextField label={t("fields.sectionTitle")} value={section.title} onChange={(title) => patchSection({ title })} />
          <EntryList
            items={section.entries}
            onChange={(entries) => patchSection({ entries })}
            create={() => customEntrySchema.parse({})}
            summarize={(e) => e.title}
          >
            {(e, patch) => (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField label={t("fields.entryTitle")} value={e.title} onChange={(title) => patch({ title })} />
                  <TextField label={t("fields.subtitle")} value={e.subtitle} onChange={(subtitle) => patch({ subtitle })} />
                  <TextField label={t("fields.date")} value={e.date} onChange={(date) => patch({ date })} />
                </div>
                <LinesField label={t("fields.highlights")} value={e.highlights} onChange={(highlights) => patch({ highlights })} />
              </>
            )}
          </EntryList>
        </>
      )}
    </EntryList>
  );
}
