import { describe, expect, it } from "vitest";

import { createResume, createSampleResume, parseResume } from "./factory";

describe("resume schema", () => {
  it("fills every field from an empty object", () => {
    const r = createResume();
    expect(r.basics.links).toEqual([]);
    expect(r.template).toBe("professional");
    expect(r.sectionOrder.length).toBeGreaterThan(0);
    expect(r.id).toMatch(/[0-9a-f-]{36}/);
  });

  it("completes partial nested entries", () => {
    const r = createResume({ experience: [{ company: "Acme" }] });
    expect(r.experience[0]).toMatchObject({ company: "Acme", role: "", highlights: [], current: false });
  });

  it("rejects malformed dates and non-resumes", () => {
    expect(parseResume({ experience: [{ startDate: "March 2020" }] })).toBeNull();
    expect(parseResume("nope")).toBeNull();
  });

  it("falls back to gray for retired sidebar tones", () => {
    expect(parseResume({ sidebarTone: "stone" })?.sidebarTone).toBe("neutral");
  });

  it("builds a valid sample in both languages", () => {
    expect(parseResume(createSampleResume("en"))).not.toBeNull();
    expect(createSampleResume("es").locale).toBe("es");
  });
});
