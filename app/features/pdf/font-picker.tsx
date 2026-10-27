import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "~/components/ui/select";
import { type FontId, fontFor, fontIds, fontMeta } from "~/features/resume/fonts";
import type { Resume } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";
import { useI18n } from "~/i18n";

/** Font for the current template; each template remembers its own choice. */
export function FontPicker({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  const groups = (["sans", "serif"] as const).map((category) => ({
    category,
    ids: fontIds.filter((id) => fontMeta[id].category === category),
  }));

  return (
    <Select
      value={fontFor(resume)}
      onValueChange={(value) => update((d) => void (d.fonts[d.template] = value as FontId), { checkpoint: true })}
    >
      <SelectTrigger size="sm" aria-label={t("templates.font")} className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectGroup key={g.category}>
            <SelectLabel>{t(g.category === "sans" ? "templates.fontSans" : "templates.fontSerif")}</SelectLabel>
            {g.ids.map((id) => (
              <SelectItem key={id} value={id}>
                {fontMeta[id].label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
