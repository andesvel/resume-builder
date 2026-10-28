import { describe, expect, it } from "vitest";

import { createResume } from "./factory";
import { QR_MAX_COMFORTABLE_VERSION, qrMatrix, qrPayload, qrPrintSize, splitName } from "./qr";
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
const resume = (qr: ResumeInput["qr"], over: ResumeInput["basics"] = {}) => createResume({ locale: "es", basics: { ...basics, ...over }, qr });

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
      "URL:https://wa.me/525512345678",
      "END:VCARD",
    ]);
  });

  it("uses the surname the user set", () => {
    const text = qrPayload(resume({ kind: "vcard", familyName: "Estrada" }, { name: "Hugart Andres Estrada" }));
    expect(text).toContain("\r\nN:Estrada;Hugart Andres;;;\r\n");
    expect(text).toContain("\r\nFN:Hugart Andres Estrada\r\n");
  });

  it("leaves out what the resume doesn't have", () => {
    const text = qrPayload(resume({ kind: "vcard" }, { headline: "", phone: "", links: [] }));
    expect(text).not.toMatch(/TITLE|TEL|URL|WhatsApp/);
    expect(qrPayload(resume({ kind: "vcard" }, { name: "" }))).toBeNull();
    expect(qrPayload(resume({ kind: "vcard" }, { phone: "", email: "", links: [] }))).toBeNull();
  });

  it("adds WhatsApp from the phone, another number or a username", () => {
    expect(qrPayload(resume({ kind: "vcard", whatsapp: "off" }))).not.toContain("wa.me");
    const other = qrPayload(resume({ kind: "vcard", whatsapp: "number", whatsappNumber: "+1 (305) 555-0100" }));
    expect(other).toContain("\r\nTEL;TYPE=CELL:+13055550100\r\n");
    expect(other).toContain("\r\nURL:https://wa.me/13055550100\r\n");
    const username = qrPayload(resume({ kind: "vcard", whatsapp: "username", whatsappUsername: " @ana.dev " }));
    expect(username).toContain("\r\nURL:https://wa.me/ana.dev\r\n");
    expect(qrPayload(resume({ kind: "vcard", whatsapp: "username" }))).not.toContain("wa.me");
  });

  it("completes numbers without a country code from the chosen region", () => {
    const local = { phone: "55 1234 5678" };
    expect(qrPayload(resume({ kind: "vcard" }, local))).not.toContain("wa.me");
    expect(qrPayload(resume({ kind: "phone" }, local))).toBe("tel:5512345678");
    expect(qrPayload(resume({ kind: "vcard", phoneRegion: "MX" }, local))).toContain("URL:https://wa.me/525512345678");
    expect(qrPayload(resume({ kind: "phone", phoneRegion: "MX" }, local))).toBe("tel:+525512345678");
  });

  it("opens a WhatsApp chat with an optional message", () => {
    expect(qrPayload(resume({ kind: "whatsapp" }))).toBe("https://wa.me/525512345678");
    expect(qrPayload(resume({ kind: "whatsapp", whatsapp: "off", whatsappMessage: "Hola, Ana & co" }))).toBe(
      "https://wa.me/525512345678?text=Hola%2C%20Ana%20%26%20co",
    );
    expect(qrPayload(resume({ kind: "whatsapp", whatsapp: "username", whatsappUsername: "@ana" }))).toBe("https://wa.me/ana");
    expect(qrPayload(resume({ kind: "whatsapp" }, { phone: "5512345678" }))).toBeNull();
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

  it("grows the printed code instead of shrinking its modules", () => {
    expect(qrPrintSize(21)).toBe(70);
    expect(qrPrintSize(57)).toBe(71);
    expect(qrPrintSize(69)).toBe(84);
  });

  it("keeps a typical vCard within the comfortable size", () => {
    expect(qrMatrix(qrPayload(resume({ kind: "vcard" }))!).version).toBeLessThanOrEqual(QR_MAX_COMFORTABLE_VERSION);
  });
});

describe("splitName", () => {
  it("guesses two surnames in Spanish and one in English", () => {
    expect(splitName("Ana Pérez Gómez", "", "es")).toEqual({ given: "Ana", family: "Pérez Gómez" });
    expect(splitName("Mary Ann Smith", "", "en")).toEqual({ given: "Mary Ann", family: "Smith" });
    expect(splitName("Ana Pérez", "", "es")).toEqual({ given: "Ana", family: "Pérez" });
    expect(splitName("Cher", "", "en")).toEqual({ given: "Cher", family: "" });
  });

  it("prefers the surname the user set", () => {
    expect(splitName("Hugart  Andres Estrada", "estrada", "es")).toEqual({ given: "Hugart Andres", family: "estrada" });
    expect(splitName("Ana Pérez", "Pérez Gómez", "es")).toEqual({ given: "Ana Pérez", family: "Pérez Gómez" });
    expect(splitName("Estrada", "Estrada", "es")).toEqual({ given: "", family: "Estrada" });
  });
});
