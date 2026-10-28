import { describe, expect, it } from "vitest";

import { dialable, internationalDigits, needsRegion, whatsappUsername } from "./phone";

describe("phone", () => {
  it("keeps numbers that carry their country code", () => {
    expect(internationalDigits("+52 (55) 1234-5678", "")).toBe("525512345678");
    expect(internationalDigits("0057 300 123 4567", "MX")).toBe("573001234567");
    expect(needsRegion("+52 55 1234 5678")).toBe(false);
  });

  it("prefixes the region's code and drops national zeros", () => {
    expect(needsRegion("0412-1234567")).toBe(true);
    expect(internationalDigits("0412-1234567", "")).toBeNull();
    expect(internationalDigits("0412-1234567", "VE")).toBe("584121234567");
    expect(internationalDigits("(305) 555-0100", "US")).toBe("13055550100");
  });

  it("builds tel: numbers and WhatsApp usernames", () => {
    expect(dialable("55 1234 5678", "MX")).toBe("+525512345678");
    expect(dialable("55 1234 5678", "")).toBe("5512345678");
    expect(needsRegion("")).toBe(false);
    expect(whatsappUsername(" @@ana dev ")).toBe("anadev");
  });
});
