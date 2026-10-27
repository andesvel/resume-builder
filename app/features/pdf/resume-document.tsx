import { Document } from "@react-pdf/renderer";

import type { Resume, TemplateId } from "~/features/resume/schema";

import { MinimalTemplate } from "./templates/minimal";
import { ModernTemplate } from "./templates/modern";
import { ProfessionalTemplate } from "./templates/professional";

const templates: Record<TemplateId, (props: { resume: Resume }) => React.ReactElement> = {
  professional: ProfessionalTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
};

export function ResumeDocument({ resume }: { resume: Resume }) {
  const Template = templates[resume.template];
  return (
    <Document title={resume.basics.name || resume.title} author={resume.basics.name} subject={resume.basics.headline} language={resume.locale} creator="Resume Builder" producer="Resume Builder">
      <Template resume={resume} />
    </Document>
  );
}
