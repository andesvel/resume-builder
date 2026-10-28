import { Page, Text, View } from "@react-pdf/renderer";

import type { Resume } from "~/features/resume/schema";

import { ContactLine, createContext, QrCode, qrLayout, Sections, type Theme, visibleSections } from "./shared";

const theme: Theme = {
  base: 9.5,
  ink: "#111111",
  muted: "#444444",
  rule: "#999999",
  heading: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.8 },
  headingRule: true,
  sectionGap: 10,
};

/** Classic single column, the safest choice for ATS parsing. */
export function ProfessionalTemplate({ resume }: { resume: Resume }) {
  const ctx = createContext(resume, theme);
  const { basics } = resume;
  const qr = qrLayout(resume);
  return (
    <Page size="A4" style={[ctx.s.page, { padding: 40 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
        {/* Same width as the code on the right so the header stays centered on the page. */}
        {qr ? <View style={{ width: qr.width }} /> : null}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ ...ctx.font.bold, fontSize: 20, lineHeight: 1.2 }}>{basics.name}</Text>
          {basics.headline ? <Text style={{ fontSize: 11, lineHeight: 1.3, color: theme.muted, marginTop: 3 }}>{basics.headline}</Text> : null}
          <ContactLine ctx={ctx} style={{ marginTop: 5, fontSize: 8.5, color: theme.muted, textAlign: "center" }} />
        </View>
        <QrCode resume={resume} />
      </View>
      <Sections ctx={ctx} sections={visibleSections(resume)} />
    </Page>
  );
}
