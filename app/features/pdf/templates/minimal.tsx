import { Page, Text, View } from "@react-pdf/renderer";

import type { Resume } from "~/features/resume/schema";

import { ContactLine, createContext, Sections, type Theme, visibleSections } from "./shared";

const theme: Theme = {
  base: 10.5,
  ink: "#1a1a1a",
  muted: "#555555",
  rule: "#dddddd",
  heading: { fontSize: 11, color: "#555555" },
  headingFace: "italic",
  headingRule: false,
  sectionGap: 14,
};

/** Serif, left-aligned, lots of whitespace. */
export function MinimalTemplate({ resume }: { resume: Resume }) {
  const ctx = createContext(resume, theme);
  const { basics } = resume;
  return (
    <Page size="A4" style={[ctx.s.page, { paddingVertical: 54, paddingHorizontal: 60 }]}>
      <View>
        <Text style={{ fontSize: 22, lineHeight: 1.2 }}>{basics.name}</Text>
        {basics.headline ? <Text style={{ fontSize: 12, lineHeight: 1.3, color: theme.muted, marginTop: 3 }}>{basics.headline}</Text> : null}
        <ContactLine ctx={ctx} separator="   ·   " style={{ marginTop: 6, fontSize: 9, color: theme.muted }} />
      </View>
      <Sections ctx={ctx} sections={visibleSections(resume)} />
    </Page>
  );
}
