import { describe, expect, it } from "vitest";

import { createResume } from "~/features/resume/factory";

import { isEmptySummary, mergeExtraction } from "./merge";

describe("mergeExtraction", () => {
  it("fills an empty resume", () => {
    const { resume, summary } = mergeExtraction(createResume({ locale: "es" }), {
      name: "John Doe",
      headline: "Frontend Developer",
      links: [{ label: "GitHub", url: "github.com/jd" }],
      experience: [{ company: "Acme", role: "Dev", startDate: "marzo 2020", endDate: "actualidad" }],
      skills: ["React", "TypeScript", "react"],
    });
    expect(resume.basics.name).toBe("John Doe");
    expect(resume.experience[0]).toMatchObject({ company: "Acme", startDate: "2020-03", current: true, endDate: "" });
    expect(resume.skills[0]).toMatchObject({ name: "Habilidades", keywords: ["React", "TypeScript"] });
    expect(summary.added).toMatchObject({ experience: 1, skills: 2, links: 1 });
  });

  it("enriches matching entries on follow-up input instead of duplicating", () => {
    const base = createResume({
      experience: [{ company: "Acme Inc.", role: "Dev", startDate: "2020-03", current: true, highlights: ["Built X"] }],
      skills: [{ name: "Tech", keywords: ["React"] }],
    });
    const { resume, summary } = mergeExtraction(base, {
      experience: [{ company: "acme", endDate: "2023-01", highlights: ["Built X", "Led Y"] }],
      skills: ["REACT", "Go"],
    });
    expect(resume.experience).toHaveLength(1);
    expect(resume.experience[0]).toMatchObject({ endDate: "2023-01", current: false, highlights: ["Built X", "Led Y"] });
    expect(resume.skills[0]?.keywords).toEqual(["React", "Go"]);
    expect(summary.updated).toEqual({ experience: 1 });
  });

  it("keeps the role of an existing job but corrects its dates", () => {
    const base = createResume({ experience: [{ company: "Globant", role: "Frontend developer", startDate: "2018-01", endDate: "2020" }] });
    const { resume } = mergeExtraction(base, { experience: [{ company: "Globant", role: "Led the migration", endDate: "2020-03" }] });
    expect(resume.experience[0]).toMatchObject({ role: "Frontend developer", endDate: "2020-03" });
  });

  it("corrects scalar fields but never blanks them", () => {
    const base = createResume({ basics: { name: "Jon", email: "a@b.co" } });
    const { resume } = mergeExtraction(base, { name: "John", email: "  " });
    expect(resume.basics).toMatchObject({ name: "John", email: "a@b.co" });
  });

  it("updates links by label or url", () => {
    const base = createResume({ basics: { links: [{ label: "GitHub", url: "github.com/old" }] } });
    const { resume } = mergeExtraction(base, { links: [{ label: "github", url: "github.com/new" }] });
    expect(resume.basics.links).toHaveLength(1);
    expect(resume.basics.links[0]?.url).toBe("github.com/new");
  });

  it("reports nothing for an empty extraction", () => {
    expect(isEmptySummary(mergeExtraction(createResume(), {}).summary)).toBe(true);
  });
});
