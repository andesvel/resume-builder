import { describe, expect, it } from "vitest";

import { displayUrl, formatDateRange, formatPartialDate, hrefFor } from "./format";

describe("format", () => {
  it("formats partial dates per locale", () => {
    expect(formatPartialDate("2020-03", "en")).toBe("Mar 2020");
    expect(formatPartialDate("2020-03", "es")).toBe("Mar 2020");
    expect(formatPartialDate("2020-09", "es")).toMatch(/^Sept? 2020$/);
    expect(formatPartialDate("2020", "en")).toBe("2020");
    expect(formatPartialDate("", "en")).toBe("");
  });

  it("formats ranges, including current roles", () => {
    expect(formatDateRange("2020-01", "", "en", true)).toBe("Jan 2020 – Present");
    expect(formatDateRange("2020-01", "", "es", true)).toBe("Ene 2020 – Actualidad");
    expect(formatDateRange("", "2021", "en")).toBe("2021");
  });

  it("normalizes urls", () => {
    expect(displayUrl("https://www.github.com/me/")).toBe("github.com/me");
    expect(hrefFor("github.com/me")).toBe("https://github.com/me");
    expect(hrefFor("mailto:a@b.co")).toBe("mailto:a@b.co");
  });
});
