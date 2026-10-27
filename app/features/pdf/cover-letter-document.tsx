import { Document, Page, Text, View } from "@react-pdf/renderer";

import { getT } from "~/i18n";
import type { Resume } from "~/features/resume/schema";

import { ContactLine, createContext, type Theme } from "./templates/shared";

const theme: Theme = {
  font: "Helvetica",
  boldFont: "Helvetica-Bold",
  italicFont: "Helvetica-Oblique",
  base: 10.5,
  ink: "#111111",
  muted: "#555555",
  rule: "#999999",
  heading: {},
  headingRule: false,
  sectionGap: 0,
};

/** One-page letter that shares the resume's header so both read as a set. */
export function CoverLetterDocument({ resume }: { resume: Resume }) {
  const ctx = createContext(resume, theme);
  const t = getT(resume.locale);
  const { basics, coverLetter: letter } = resume;
  const date = new Intl.DateTimeFormat(resume.locale, { dateStyle: "long" }).format(new Date());
  const paragraphs = letter.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <Document title={`${basics.name} – ${t("letter.tab")}`} author={basics.name} language={resume.locale} creator="Resume Builder" producer="Resume Builder">
      <Page size="A4" style={[ctx.s.page, { paddingVertical: 56, paddingHorizontal: 64, lineHeight: 1.5 }]}>
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontFamily: theme.boldFont, fontSize: 18, lineHeight: 1.2 }}>{basics.name}</Text>
          {basics.headline ? <Text style={{ color: theme.muted }}>{basics.headline}</Text> : null}
          <ContactLine ctx={ctx} style={{ marginTop: 4, fontSize: 9, color: theme.muted }} />
        </View>
        <Text style={{ color: theme.muted, marginBottom: 16 }}>{date}</Text>
        {letter.company || letter.recipient ? (
          <View style={{ marginBottom: 16 }}>
            {letter.recipient ? <Text>{letter.recipient}</Text> : null}
            {letter.company ? <Text>{letter.company}</Text> : null}
          </View>
        ) : null}
        <Text style={{ marginBottom: 10 }}>{t("letter.greeting", { name: letter.recipient || t("letter.defaultRecipient") })}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={{ marginBottom: 10, textAlign: "justify" }}>
            {p}
          </Text>
        ))}
        <Text style={{ marginTop: 14 }}>{t("letter.closing")}</Text>
        <Text style={{ fontFamily: theme.boldFont, marginTop: 4 }}>{basics.name}</Text>
      </Page>
    </Document>
  );
}
