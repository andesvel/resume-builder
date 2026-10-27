import { ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import type { Resume, SectionKey } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";
import { cn } from "~/lib/utils";

import { BasicsSection, SummarySection } from "./sections/basics";
import { CustomSections } from "./sections/custom";
import { EducationSection } from "./sections/education";
import { ExperienceSection } from "./sections/experience";
import { CertificationsSection, ProjectsSection } from "./sections/projects";
import { LanguagesSection, SkillsSection } from "./sections/skills";

function renderSection(key: SectionKey, resume: Resume) {
  switch (key) {
    case "summary":
      return <SummarySection summary={resume.basics.summary} />;
    case "experience":
      return <ExperienceSection items={resume.experience} />;
    case "education":
      return <EducationSection items={resume.education} />;
    case "skills":
      return <SkillsSection items={resume.skills} />;
    case "projects":
      return <ProjectsSection items={resume.projects} />;
    case "certifications":
      return <CertificationsSection items={resume.certifications} />;
    case "languages":
      return <LanguagesSection items={resume.languages} />;
    case "custom":
      return <CustomSections items={resume.custom} />;
  }
}

export function ResumeEditor({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);

  const move = (index: number, delta: number) =>
    update((d) => {
      const [key] = d.sectionOrder.splice(index, 1);
      if (key) d.sectionOrder.splice(index + delta, 0, key);
    }, { checkpoint: true });

  const toggle = (key: SectionKey) =>
    update((d) => {
      d.hiddenSections = d.hiddenSections.includes(key)
        ? d.hiddenSections.filter((k) => k !== key)
        : [...d.hiddenSections, key];
    }, { checkpoint: true });

  return (
    <Accordion type="multiple" defaultValue={["basics"]} className="rounded-lg border">
      <AccordionItem value="basics" className="px-4">
        <AccordionTrigger>{t("sections.basics")}</AccordionTrigger>
        <AccordionContent>
          <BasicsSection basics={resume.basics} />
        </AccordionContent>
      </AccordionItem>
      {resume.sectionOrder.map((key, index) => {
        const hidden = resume.hiddenSections.includes(key);
        return (
          <AccordionItem key={key} value={key} className="px-4">
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <AccordionTrigger className={cn(hidden && "text-muted-foreground")}>
                  {t(`sections.${key}`)}
                </AccordionTrigger>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={t(hidden ? "editor.show" : "editor.hide")} onClick={() => toggle(key)}>
                {hidden ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("editor.moveUp")} disabled={index === 0} onClick={() => move(index, -1)}>
                <ChevronUpIcon />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("editor.moveDown")} disabled={index === resume.sectionOrder.length - 1} onClick={() => move(index, 1)}>
                <ChevronDownIcon />
              </Button>
            </div>
            <AccordionContent>{renderSection(key, resume)}</AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
