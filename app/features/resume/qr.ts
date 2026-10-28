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
function vcard({ basics }: Resume): string | null {
  const name = basics.name.trim();
  const phone = dialable(basics.phone);
  const email = basics.email.trim();
  const url = basics.links.find((l) => l.url.trim())?.url;
  if (!name || !(phone || email || url)) return null;
  // Given name first, the rest as family name: fits "Ana Pérez" and "Ana Pérez Gómez".
  const [given = "", ...family] = name.split(/\s+/);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escape(family.join(" "))};${escape(given)};;;`,
    `FN:${escape(name)}`,
    basics.headline.trim() && `TITLE:${escape(basics.headline.trim())}`,
    phone && `TEL;TYPE=CELL:${phone}`,
    email && `EMAIL:${escape(email)}`,
    url && `URL:${escape(hrefFor(url))}`,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n");
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
