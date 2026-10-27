import { TagsField, TextField } from "../fields";
import { EntryList } from "../entry-list";
import { useI18n } from "~/i18n";
import { languageSchema, skillGroupSchema, type Language, type SkillGroup } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";

export function SkillsSection({ items }: { items: SkillGroup[] }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  return (
    <EntryList
      items={items}
      onChange={(next) => update((d) => void (d.skills = next))}
      create={() => skillGroupSchema.parse({})}
      summarize={(g) => g.name || g.keywords.slice(0, 3).join(", ")}
    >
      {(g, patch) => (
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <TextField label={t("fields.group")} value={g.name} onChange={(name) => patch({ name })} />
          <TagsField label={t("fields.keywords")} value={g.keywords} onChange={(keywords) => patch({ keywords })} />
        </div>
      )}
    </EntryList>
  );
}

export function LanguagesSection({ items }: { items: Language[] }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  return (
    <EntryList
      items={items}
      onChange={(next) => update((d) => void (d.languages = next))}
      create={() => languageSchema.parse({})}
      summarize={(l) => [l.language, l.fluency].filter(Boolean).join(" · ")}
    >
      {(l, patch) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t("fields.language")} value={l.language} onChange={(language) => patch({ language })} />
          <TextField label={t("fields.fluency")} value={l.fluency} onChange={(fluency) => patch({ fluency })} />
        </div>
      )}
    </EntryList>
  );
}
