// Latin regular faces so each option renders in its own font. The browser
// only downloads a file once its option is shown.
import "@fontsource/inter/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/eb-garamond/latin-400.css";
import "@fontsource/lora/latin-400.css";
import "@fontsource/source-serif-4/latin-400.css";

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

  const current = fontFor(resume);

  return (
    <Select
      value={current}
      onValueChange={(value) => update((d) => void (d.fonts[d.template] = value as FontId), { checkpoint: true })}
    >
      <SelectTrigger size="sm" aria-label={t("templates.font")} className="w-44" style={{ fontFamily: fontMeta[current].css }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectGroup key={g.category}>
            <SelectLabel>{t(g.category === "sans" ? "templates.fontSans" : "templates.fontSerif")}</SelectLabel>
            {g.ids.map((id) => (
              <SelectItem key={id} value={id} style={{ fontFamily: fontMeta[id].css }} className="text-[15px]">
                {fontMeta[id].label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
