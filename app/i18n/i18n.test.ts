import { describe, expect, it } from "vitest";

import { resolveLocale } from "./config";
import { getT } from "./index";

const req = (headers: Record<string, string>) => new Request("https://x.test/", { headers });

describe("resolveLocale", () => {
  it("prefers the cookie", () => {
    expect(resolveLocale(req({ Cookie: "a=1; locale=es", "Accept-Language": "en-US" }))).toBe("es");
  });
  it("falls back to Accept-Language", () => {
    expect(resolveLocale(req({ "Accept-Language": "es-CO,es;q=0.9,en;q=0.8" }))).toBe("es");
  });
  it("defaults to en", () => {
    expect(resolveLocale(req({ "Accept-Language": "fr-FR" }))).toBe("en");
  });
});

describe("translate", () => {
  it("resolves nested keys per locale", () => {
    expect(getT("es")("common.save")).toBe("Guardar");
    expect(getT("en")("common.save")).toBe("Save");
  });
});
