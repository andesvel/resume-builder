import { describe, expect, it } from "vitest";

import { polishExtraction, polishSkill } from "./polish";

describe("polish", () => {
  it("turns role-like items into skills or drops them", () => {
    expect(polishSkill("desarrollador react")).toBe("React");
    expect(polishSkill("typescript")).toBe("TypeScript");
    expect(polishSkill("frontend lead")).toBe("frontend");
    expect(polishSkill("led a team of five people well")).toBeNull();
  });

  it("canonicalizes languages and casing per locale", () => {
    const x = polishExtraction(
      {
        headline: "desarrollador frontend",
        experience: [{ role: "frontend lead" }],
        education: [{ degree: "ingeniería de sistemas" }],
        skills: ["desarrollador frontend", "ingeniería de sistemas", "typescript"],
        languages: [{ language: "ingles", fluency: "avanzado" }, { language: "frances", fluency: "basico" }],
      },
      "es",
    );
    expect(x.headline).toBe("Desarrollador frontend");
    expect(x.skills).toEqual(["TypeScript"]);
    expect(x.languages).toEqual([
      { language: "Inglés", fluency: "Avanzado" },
      { language: "Francés", fluency: "Básico" },
    ]);
  });
});
