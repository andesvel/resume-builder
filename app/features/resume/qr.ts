import { encode } from "uqr";

import { hrefFor } from "./format";
import type { Resume } from "./schema";

/**
 * Text a resume's QR code carries, or null when the chosen kind has nothing to
 * point at (no phone for "phone", no links for "url", …).
 */
export function qrPayload(resume: Resume): string | null {
  const { basics, qr } = resume;
  switch (qr.kind) {
    case "vcard":
      return vcard(resume);
    case "url": {
      const link = basics.links.find((l) => l.id === qr.linkId && l.url.trim()) ?? basics.links.find((l) => l.url.trim());
      return link ? hrefFor(link.url) : null;
    }
    case "email": {
      const email = basics.email.trim();
      if (!email) return null;
      const subject = qr.subject.trim();
      return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
    }
    case "phone": {
      const phone = dialable(basics.phone);
      return phone ? `tel:${phone}` : null;
    }
  }
}

/** URL a PDF reader can open by clicking the code; a vCard has none. */
export function qrHref(resume: Resume, payload: string): string | undefined {
  return resume.qr.kind === "vcard" ? undefined : payload;
}

/** vCard 3.0 with the fields a recruiter would save; null without a name or a way to reach them. */
function vcard({ basics, qr, locale }: Resume): string | null {
  const name = basics.name.trim();
  const phone = dialable(basics.phone);
  const email = basics.email.trim();
  const url = basics.links.find((l) => l.url.trim())?.url;
  if (!name || !(phone || email || url)) return null;
  const { given, family } = splitName(name, qr.familyName, locale);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escape(family)};${escape(given)};;;`,
    `FN:${escape(name)}`,
    basics.headline.trim() && `TITLE:${escape(basics.headline.trim())}`,
    phone && `TEL;TYPE=CELL:${phone}`,
    email && `EMAIL:${escape(email)}`,
    url && `URL:${escape(hrefFor(url))}`,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n");
}

/**
 * Splits a full name into given and family names for the vCard, which phones
 * use to sort contacts. `familyName` (set by the user) wins; otherwise it's a
 * guess, since "Ana Pérez Gómez" and "Hugart Andres Estrada" look alike: two
 * surnames in Spanish, one in English.
 */
export function splitName(name: string, familyName: string, locale: Resume["locale"]): { given: string; family: string } {
  const full = name.trim().replace(/\s+/g, " ");
  const family = familyName.trim().replace(/\s+/g, " ");
  if (family) {
    const lower = full.toLowerCase();
    const suffix = family.toLowerCase();
    if (lower === suffix) return { given: "", family };
    // Surname(s) not at the end of the name: keep the whole name as given rather than guess.
    return { given: lower.endsWith(` ${suffix}`) ? full.slice(0, -family.length).trim() : full, family };
  }
  const words = full.split(" ");
  if (words.length < 2) return { given: full, family: "" };
  const surnames = locale === "es" && words.length >= 3 ? 2 : 1;
  return { given: words.slice(0, -surnames).join(" "), family: words.slice(-surnames).join(" ") };
}

function escape(value: string): string {
  return value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
}

/** "+52 (55) 1234-5678" -> "+525512345678". */
function dialable(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `${trimmed.startsWith("+") ? "+" : ""}${digits}` : "";
}

export type QrMatrix = { size: number; version: number; path: string };

/** Above this version modules drop below ~0.4 mm at the printed size (22 mm) and phones start to struggle. */
export const QR_MAX_COMFORTABLE_VERSION = 10;

/**
 * Encodes text as an SVG path in module units (one unit per module, no quiet
 * zone). Runs of dark modules in a row become one rectangle to keep it short.
 */
export function qrMatrix(text: string): QrMatrix {
  const { data, size, version } = encode(text, { ecc: "M", border: 0 });
  let path = "";
  data.forEach((row, y) => {
    for (let x = 0; x < size; x++) {
      if (!row[x]) continue;
      const start = x;
      while (row[x + 1]) x++;
      path += `M${start} ${y}h${x - start + 1}v1h${start - x - 1}z`;
    }
  });
  return { size, version, path };
}
