import { Font } from "@react-pdf/renderer";

import interRegular from "@fontsource/inter/files/inter-latin-400-normal.woff?url";
import interBold from "@fontsource/inter/files/inter-latin-700-normal.woff?url";
import interItalic from "@fontsource/inter/files/inter-latin-400-italic.woff?url";
import ibmPlexSansRegular from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff?url";
import ibmPlexSansBold from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff?url";
import ibmPlexSansItalic from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff?url";
import sourceSans3Regular from "@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff?url";
import sourceSans3Bold from "@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff?url";
import sourceSans3Italic from "@fontsource/source-sans-3/files/source-sans-3-latin-400-italic.woff?url";
import ebGaramondRegular from "@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff?url";
import ebGaramondBold from "@fontsource/eb-garamond/files/eb-garamond-latin-700-normal.woff?url";
import ebGaramondItalic from "@fontsource/eb-garamond/files/eb-garamond-latin-400-italic.woff?url";
import loraRegular from "@fontsource/lora/files/lora-latin-400-normal.woff?url";
import loraBold from "@fontsource/lora/files/lora-latin-700-normal.woff?url";
import loraItalic from "@fontsource/lora/files/lora-latin-400-italic.woff?url";
import sourceSerif4Regular from "@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff?url";
import sourceSerif4Bold from "@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff?url";
import sourceSerif4Italic from "@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff?url";

import { type FontId, fontMeta } from "~/features/resume/fonts";

import type { Style } from "./templates/shared";

export interface FontFaces {
  regular: Style;
  bold: Style;
  italic: Style;
}

/** Built-in PDF fonts are separate families per style. */
const builtIn: Partial<Record<FontId, FontFaces>> = {
  helvetica: {
    regular: { fontFamily: "Helvetica" },
    bold: { fontFamily: "Helvetica-Bold" },
    italic: { fontFamily: "Helvetica-Oblique" },
  },
  times: {
    regular: { fontFamily: "Times-Roman" },
    bold: { fontFamily: "Times-Bold" },
    italic: { fontFamily: "Times-Italic" },
  },
};

/** Latin subset (covers Spanish and common punctuation), served from our own assets. */
const files: Record<Exclude<FontId, "helvetica" | "times">, { regular: string; bold: string; italic: string }> = {
  "inter": { regular: interRegular, bold: interBold, italic: interItalic },
  "ibm-plex-sans": { regular: ibmPlexSansRegular, bold: ibmPlexSansBold, italic: ibmPlexSansItalic },
  "source-sans-3": { regular: sourceSans3Regular, bold: sourceSans3Bold, italic: sourceSans3Italic },
  "eb-garamond": { regular: ebGaramondRegular, bold: ebGaramondBold, italic: ebGaramondItalic },
  "lora": { regular: loraRegular, bold: loraBold, italic: loraItalic },
  "source-serif-4": { regular: sourceSerif4Regular, bold: sourceSerif4Bold, italic: sourceSerif4Italic },
};

// No automatic hyphenation: words split across lines ("e-com-merce") are
// extracted as fragments by ATS parsers. Long words wrap whole instead.
Font.registerHyphenationCallback((word) => [word]);

const registered = new Set<FontId>();
type EmbeddedFont = keyof typeof files;

function register(id: EmbeddedFont, f: { regular: string; bold: string; italic: string } = files[id]) {
  if (registered.has(id)) return;
  Font.register({
    family: fontMeta[id].label,
    fonts: [
      { src: f.regular, fontWeight: 400 },
      { src: f.bold, fontWeight: 700 },
      { src: f.italic, fontWeight: 400, fontStyle: "italic" },
    ],
  });
  registered.add(id);
}

/** Style fragments for a font's regular, bold and italic faces (registering it on first use). */
export function fontFaces(id: FontId): FontFaces {
  const native = builtIn[id];
  if (native) return native;
  register(id as EmbeddedFont);
  const family = fontMeta[id].label;
  return {
    regular: { fontFamily: family },
    bold: { fontFamily: family, fontWeight: 700 },
    italic: { fontFamily: family, fontStyle: "italic" },
  };
}

/**
 * Register a font from sources resolved by the caller. The Worker can't fetch
 * its own asset URLs, so it reads the files through the ASSETS binding and
 * passes data URLs.
 */
export async function preloadFont(id: FontId, toSource: (assetUrl: string) => Promise<string>) {
  if (registered.has(id) || id in builtIn) return;
  const f = files[id as EmbeddedFont];
  const [regular, bold, italic] = await Promise.all([toSource(f.regular), toSource(f.bold), toSource(f.italic)]);
  register(id as EmbeddedFont, { regular, bold, italic });
}
