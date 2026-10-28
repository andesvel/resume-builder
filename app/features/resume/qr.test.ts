import { describe, expect, it } from "vitest";

import { createResume } from "./factory";
import { QR_MAX_COMFORTABLE_VERSION, qrMatrix, qrPayload } from "./qr";
import type { ResumeInput } from "./schema";

const basics = {
  name: "Ana Pérez Gómez",
  headline: "Backend, Go; SRE",
  email: "ana@example.com",
  phone: "+52 (55) 1234-5678",
  links: [
    { id: "a", label: "Site", url: "ana.dev" },
    { id: "b", label: "LinkedIn", url: "https://linkedin.com/in/ana" },
  ],
};
const resume = (qr: ResumeInput["qr"], over: ResumeInput["basics"] = {}) => createResume({ basics: { ...basics, ...over }, qr });

describe("qrPayload", () => {
  it("builds an escaped vCard", () => {
    expect(qrPayload(resume({ kind: "vcard" }))?.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Pérez Gómez;Ana;;;",
      "FN:Ana Pérez Gómez",
      "TITLE:Backend\\, Go\\; SRE",
      "TEL;TYPE=CELL:+525512345678",
      "EMAIL:ana@example.com",
      "URL:https://ana.dev",
      "END:VCARD",
    ]);
  });

  it("leaves out what the resume doesn't have", () => {
    const text = qrPayload(resume({ kind: "vcard" }, { headline: "", phone: "", links: [] }));
    expect(text).not.toMatch(/TITLE|TEL|URL/);
    expect(qrPayload(resume({ kind: "vcard" }, { name: "" }))).toBeNull();
    expect(qrPayload(resume({ kind: "vcard" }, { phone: "", email: "", links: [] }))).toBeNull();
  });

  it("uses the chosen link, falling back to the first", () => {
    expect(qrPayload(resume({ kind: "url", linkId: "b" }))).toBe("https://linkedin.com/in/ana");
    expect(qrPayload(resume({ kind: "url", linkId: "gone" }))).toBe("https://ana.dev");
    expect(qrPayload(resume({ kind: "url" }, { links: [] }))).toBeNull();
  });

  it("builds mailto and tel links", () => {
    expect(qrPayload(resume({ kind: "email", subject: "Application – Ana & co" }))).toBe(
      "mailto:ana@example.com?subject=Application%20%E2%80%93%20Ana%20%26%20co",
    );
    expect(qrPayload(resume({ kind: "email" }))).toBe("mailto:ana@example.com");
    expect(qrPayload(resume({ kind: "phone" }))).toBe("tel:+525512345678");
    expect(qrPayload(resume({ kind: "phone" }, { phone: "ext." }))).toBeNull();
  });
});

describe("qrMatrix", () => {
  it("draws one rectangle per run of dark modules", () => {
    const { size, version, path } = qrMatrix("tel:+525512345678");
    expect(size).toBe(version * 4 + 17);
    // Finder pattern: the top row starts with a run of 7 dark modules.
    expect(path.startsWith("M0 0h7v1h-7z")).toBe(true);
  });

  it("keeps a typical vCard within the comfortable size", () => {
    expect(qrMatrix(qrPayload(resume({ kind: "vcard" }))!).version).toBeLessThanOrEqual(QR_MAX_COMFORTABLE_VERSION);
  });
});
