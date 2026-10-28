import { Link, Path, Rect, StyleSheet, Svg, Text, View, type Styles as PdfStyles } from "@react-pdf/renderer";

import { getT, type TFunction } from "~/i18n";
import { displayUrl, formatDateRange, formatPartialDate, hrefFor, nonEmpty } from "~/features/resume/format";
import { fontFor } from "~/features/resume/fonts";
import { QR_QUIET_ZONE, qrHref, qrMatrix, qrPayload, qrPrintSize } from "~/features/resume/qr";
import type { Resume, SectionKey } from "~/features/resume/schema";

import { type FontFaces, fontFaces } from "../fonts";

export type Style = PdfStyles[string];

/** Visual knobs a template can tweak while reusing the shared section renderers. */
export interface Theme {
  base: number;
  ink: string;
  muted: string;
  rule: string;
  /** Section heading style and which face it uses. */
  heading: Style;
  headingFace?: keyof FontFaces;
  /** Draw a rule under section headings. */
  headingRule: boolean;
  sectionGap: number;
}

type StyleName =
  | "page" | "section" | "heading" | "rule" | "entry" | "row" | "title" | "subtitle" | "meta"
  | "bullet" | "bulletDot" | "bulletText" | "paragraph" | "inline" | "link";

export type Styles = Record<StyleName, Style>;

export function createStyles(theme: Theme, font: FontFaces): Styles {
  return StyleSheet.create({
    // react-pdf resolves an inherited unitless lineHeight against the page's
    // font size, so larger text (name, headline) must set its own.
    page: { ...font.regular, fontSize: theme.base, color: theme.ink, lineHeight: 1.35 },
    section: { marginTop: theme.sectionGap },
    heading: { ...font[theme.headingFace ?? "bold"], ...theme.heading },
    rule: { borderBottomWidth: 0.6, borderBottomColor: theme.rule, marginTop: 2, marginBottom: 5 },
    entry: { marginBottom: 6 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    title: font.bold,
    subtitle: { color: theme.muted },
    meta: { color: theme.muted, fontSize: theme.base - 0.5, textAlign: "right", flexShrink: 0 },
    bullet: { flexDirection: "row", marginTop: 1.5, paddingLeft: 2 },
    bulletDot: { width: 9 },
    bulletText: { flex: 1 },
    paragraph: { textAlign: "justify" },
    inline: font.bold,
    link: { color: theme.ink, textDecoration: "none" },
  });
}

export interface RenderContext {
  resume: Resume;
  t: TFunction;
  s: Styles;
  theme: Theme;
  font: FontFaces;
  /** Narrow column (e.g. a sidebar): dates go under the title instead of beside it. */
  compact?: boolean;
}

export function createContext(resume: Resume, theme: Theme): RenderContext {
  const font = fontFaces(fontFor(resume));
  return { resume, t: getT(resume.locale), s: createStyles(theme, font), theme, font };
}

/** Sections in user order, minus hidden and empty ones. */
export function visibleSections(resume: Resume, exclude: SectionKey[] = []): SectionKey[] {
  const hasContent: Record<SectionKey, boolean> = {
    summary: resume.basics.summary.trim().length > 0,
    experience: resume.experience.length > 0,
    education: resume.education.length > 0,
    skills: resume.skills.some((g) => g.keywords.length > 0),
    projects: resume.projects.length > 0,
    certifications: resume.certifications.length > 0,
    languages: resume.languages.length > 0,
    custom: resume.custom.some((c) => c.entries.length > 0),
  };
  return resume.sectionOrder.filter((k) => hasContent[k] && !resume.hiddenSections.includes(k) && !exclude.includes(k));
}

export function contactItems(resume: Resume): { label: string; href?: string }[] {
  const { email, phone, location, links } = resume.basics;
  return [
    email && { label: email, href: `mailto:${email}` },
    phone && { label: phone, href: `tel:${phone.replace(/\s+/g, "")}` },
    location && { label: location },
    ...links.filter((l) => l.url).map((l) => ({ label: displayUrl(l.url), href: hrefFor(l.url) })),
  ].filter((x): x is { label: string; href?: string } => Boolean(x));
}

/** The resume's QR code, laid out for print, or null when it's off or has nothing to carry. */
export function qrLayout(resume: Resume): { text: string; size: number; path: string; width: number } | null {
  const text = resume.qr.enabled ? qrPayload(resume) : null;
  if (!text) return null;
  const { size, path } = qrMatrix(text);
  return { text, size, path, width: qrPrintSize(size) };
}

/**
 * Vector QR code, black on white whatever the template's colors, so it prints
 * sharp and scans on tinted backgrounds. Clickable in the PDF unless it's a vCard.
 */
export function QrCode({ resume, style }: { resume: Resume; style?: Style }) {
  const qr = qrLayout(resume);
  if (!qr) return null;
  const box = qr.size + QR_QUIET_ZONE * 2;
  const code = (
    <Svg width={qr.width} height={qr.width} viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${box} ${box}`}>
      <Rect x={-QR_QUIET_ZONE} y={-QR_QUIET_ZONE} width={box} height={box} fill="#ffffff" />
      <Path d={qr.path} fill="#000000" />
    </Svg>
  );
  const href = qrHref(resume, qr.text);
  return <View style={[{ width: qr.width, height: qr.width, flexShrink: 0 }, style ?? {}]}>{href ? <Link src={href}>{code}</Link> : code}</View>;
}

export function Heading({ ctx, children }: { ctx: RenderContext; children: string }) {
  return (
    <View minPresenceAhead={40}>
      <Text style={ctx.s.heading}>{children}</Text>
      {ctx.theme.headingRule ? <View style={ctx.s.rule} /> : <View style={{ height: 4 }} />}
    </View>
  );
}

export function Bullets({ ctx, items }: { ctx: RenderContext; items: string[] }) {
  return (
    <>
      {nonEmpty(items).map((item, i) => (
        <View key={i} style={ctx.s.bullet}>
          <Text style={ctx.s.bulletDot}>•</Text>
          <Text style={ctx.s.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function Entry({ ctx, title, subtitle, meta, children }: { ctx: RenderContext; title: string; subtitle?: string; meta?: string; children?: React.ReactNode }) {
  return (
    <View style={ctx.s.entry} wrap={false}>
      {ctx.compact ? (
        <>
          <Text style={ctx.s.title}>{title}</Text>
          {meta ? <Text style={[ctx.s.meta, { textAlign: "left" }]}>{meta}</Text> : null}
        </>
      ) : (
        <View style={ctx.s.row}>
          {/* flex: 1 lets a long title wrap instead of running into the date. */}
          <Text style={[ctx.s.title, { flex: 1 }]}>{title}</Text>
          {meta ? <Text style={ctx.s.meta}>{meta}</Text> : null}
        </View>
      )}
      {subtitle ? <Text style={ctx.s.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(" · ");

/** Renders one section's body with the shared, ATS-friendly layout. */
export function SectionBody({ ctx, section }: { ctx: RenderContext; section: SectionKey }) {
  const { resume, s } = ctx;
  const locale = resume.locale;

  switch (section) {
    case "summary":
      return <Text style={s.paragraph}>{resume.basics.summary.trim()}</Text>;
    case "experience":
      return (
        <>
          {resume.experience.map((e) => (
            <Entry key={e.id} ctx={ctx} title={e.role || e.company} subtitle={join(e.role ? e.company : "", e.location)} meta={formatDateRange(e.startDate, e.endDate, locale, e.current)}>
              <Bullets ctx={ctx} items={e.highlights} />
            </Entry>
          ))}
        </>
      );
    case "education":
      return (
        <>
          {resume.education.map((e) => (
            <Entry
              key={e.id}
              ctx={ctx}
              title={e.institution}
              subtitle={join([e.degree, e.field].filter(Boolean).join(ctx.t("pdf.in")), e.gpa && `${ctx.t("fields.gpa")}: ${e.gpa}`, e.honors)}
              meta={formatDateRange(e.startDate, e.endDate, locale, e.current)}
            />
          ))}
        </>
      );
    case "skills":
      return (
        <>
          {resume.skills.filter((g) => g.keywords.length).map((g) => (
            <Text key={g.id} style={{ marginBottom: 2 }}>
              {g.name ? <Text style={s.inline}>{g.name}: </Text> : null}
              {nonEmpty(g.keywords).join(", ")}
            </Text>
          ))}
        </>
      );
    case "projects":
      return (
        <>
          {resume.projects.map((p) => (
            <Entry key={p.id} ctx={ctx} title={p.name} meta={p.url ? displayUrl(p.url) : undefined} subtitle={p.description}>
              <Bullets ctx={ctx} items={p.highlights} />
            </Entry>
          ))}
        </>
      );
    case "certifications":
      return (
        <>
          {resume.certifications.map((c) => (
            <Entry key={c.id} ctx={ctx} title={c.name} subtitle={c.issuer} meta={formatPartialDate(c.date, locale)} />
          ))}
        </>
      );
    case "languages":
      return <Text>{resume.languages.map((l) => join(l.language, l.fluency).replace(" · ", " — ")).join("   ·   ")}</Text>;
    case "custom":
      return null;
  }
}

/** Custom sections each get their own heading, so they render separately. */
export function CustomSectionsBlock({ ctx }: { ctx: RenderContext }) {
  return (
    <>
      {ctx.resume.custom.filter((c) => c.entries.length).map((c) => (
        <View key={c.id} style={ctx.s.section}>
          <Heading ctx={ctx}>{c.title}</Heading>
          {c.entries.map((e) => (
            <Entry key={e.id} ctx={ctx} title={e.title} subtitle={e.subtitle} meta={e.date}>
              <Bullets ctx={ctx} items={e.highlights} />
            </Entry>
          ))}
        </View>
      ))}
    </>
  );
}

export function Sections({ ctx, sections }: { ctx: RenderContext; sections: SectionKey[] }) {
  return (
    <>
      {sections.map((key) =>
        key === "custom" ? (
          <CustomSectionsBlock key={key} ctx={ctx} />
        ) : (
          <View key={key} style={ctx.s.section}>
            <Heading ctx={ctx}>{ctx.t(`sections.${key}`)}</Heading>
            <SectionBody ctx={ctx} section={key} />
          </View>
        ),
      )}
    </>
  );
}

export function ContactLine({ ctx, separator = "  |  ", style }: { ctx: RenderContext; separator?: string; style?: Style }) {
  const items = contactItems(ctx.resume);
  return (
    <Text style={style}>
      {items.map((item, i) => (
        <Text key={i}>
          {i > 0 ? separator : ""}
          {item.href ? (
            <Link src={item.href} style={ctx.s.link}>
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </Text>
      ))}
    </Text>
  );
}
