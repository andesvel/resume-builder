import { Link, Page, Text, View } from "@react-pdf/renderer";

import type { Resume, SectionKey } from "~/features/resume/schema";
import { nonEmpty } from "~/features/resume/format";

import { contactItems, createContext, Heading, Sections, type Theme, visibleSections } from "./shared";

const theme: Theme = {
  font: "Helvetica",
  boldFont: "Helvetica-Bold",
  italicFont: "Helvetica-Oblique",
  base: 9,
  ink: "#111111",
  muted: "#555555",
  rule: "#111111",
  heading: { fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.2 },
  headingRule: true,
  sectionGap: 12,
};

const SIDEBAR: SectionKey[] = ["skills", "languages", "certifications"];

/** Two columns: contact and short lists on the left, narrative on the right. */
export function ModernTemplate({ resume }: { resume: Resume }) {
  const ctx = createContext(resume, theme);
  const { basics } = resume;
  const sections = visibleSections(resume);
  const side = sections.filter((k) => SIDEBAR.includes(k));
  const main = sections.filter((k) => !SIDEBAR.includes(k));

  return (
    <Page size="A4" style={[ctx.s.page, { flexDirection: "row" }]}>
      <View style={{ width: "32%", backgroundColor: "#f3f3f3", paddingVertical: 36, paddingHorizontal: 18 }}>
        <Text style={{ fontFamily: theme.boldFont, fontSize: 17, lineHeight: 1.15 }}>{basics.name}</Text>
        {basics.headline ? <Text style={{ color: theme.muted, marginTop: 4, fontSize: 10 }}>{basics.headline}</Text> : null}
        <View style={ctx.s.section}>
          <Heading ctx={ctx}>{ctx.t("pdf.contact")}</Heading>
          {contactItems(resume).map((item, i) =>
            item.href ? (
              <Link key={i} src={item.href} style={[ctx.s.link, { marginBottom: 2 }]}>
                {item.label}
              </Link>
            ) : (
              <Text key={i} style={{ marginBottom: 2 }}>{item.label}</Text>
            ),
          )}
        </View>
        {side.includes("skills")
          ? resume.skills.filter((g) => g.keywords.length).map((g, i) => (
              <View key={g.id} style={ctx.s.section}>
                <Heading ctx={ctx}>{g.name || (i === 0 ? ctx.t("sections.skills") : "")}</Heading>
                {nonEmpty(g.keywords).map((k) => (
                  <Text key={k} style={{ marginBottom: 1.5 }}>{k}</Text>
                ))}
              </View>
            ))
          : null}
        <Sections ctx={ctx} sections={side.filter((k) => k !== "skills")} />
      </View>
      <View style={{ flex: 1, paddingVertical: 36, paddingHorizontal: 24 }}>
        <Sections ctx={ctx} sections={main} />
      </View>
    </Page>
  );
}
