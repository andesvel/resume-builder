import { describe, expect, it } from "vitest";

import { createResume } from "~/features/resume/factory";

import { addEntry, applyChanges, createFromChanges, moveEntry, removeEntry, updateEntry } from "./operations";

describe("MCP operations", () => {
  it("creates a complete resume from partial data", () => {
    const r = createFromChanges({ basics: { name: "Ana" }, experience: [{ company: "Acme" }], template: "modern" });
    expect(r.title).toBe("Ana");
    expect(r.experience[0]).toMatchObject({ company: "Acme", role: "", highlights: [] });
    expect(r.template).toBe("modern");
  });

  it("merges basics and replaces sections", () => {
    const base = createResume({ basics: { name: "Ana", email: "a@b.co" }, skills: [{ keywords: ["Go"] }] });
    const r = applyChanges(base, { basics: { phone: "123" }, skills: [{ name: "Tech", keywords: ["Rust"] }], fonts: { minimal: "lora" } });
    expect(r.basics).toMatchObject({ name: "Ana", email: "a@b.co", phone: "123" });
    expect(r.skills.map((s) => s.keywords)).toEqual([["Rust"]]);
    expect(r.fonts.minimal).toBe("lora");
  });

  it("rejects invalid values instead of storing them", () => {
    expect(() => applyChanges(createResume(), { experience: [{ startDate: "March 2020" }] })).toThrow();
  });

  it("adds, updates, moves and removes entries (links included)", () => {
    let { resume, entryId } = addEntry(createResume(), "experience", { company: "A" });
    ({ resume } = addEntry(resume, "experience", { company: "B" }, 0));
    resume = updateEntry(resume, "experience", entryId, { role: "Dev" });
    expect(resume.experience.map((e) => e.company)).toEqual(["B", "A"]);
    resume = moveEntry(resume, "experience", entryId, 0);
    expect(resume.experience[0]).toMatchObject({ company: "A", role: "Dev" });
    resume = removeEntry(resume, "experience", entryId);
    expect(resume.experience.map((e) => e.company)).toEqual(["B"]);

    const link = addEntry(resume, "links", { label: "GitHub", url: "github.com/a" });
    expect(link.resume.basics.links).toHaveLength(1);
    expect(() => removeEntry(resume, "links", "nope")).toThrow(/No entry/);
  });
});
