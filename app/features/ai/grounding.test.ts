import { describe, expect, it } from "vitest";

import { groundDate, groundExtraction, isGrounded, isHighlightGrounded } from "./grounding";

const text =
  "Tambien trabaje en Globant desde enero 2018 hasta 2020 como desarrollador react, migre una app a typescript. Estudie ingenieria de sistemas en la Universidad Nacional. Hablo frances basico.";

describe("groundDate", () => {
  it("drops invented years and months", () => {
    expect(groundDate("2016", text)).toBeUndefined();
    expect(groundDate("2020-03", "de 2018 a 2020")).toBe("2020");
    expect(groundDate("2018-01", text)).toBe("2018-01");
    expect(groundDate("2020-03", text)).toBe("2020");
    expect(groundDate("2019-05", "trabajé desde 05/2019")).toBe("2019-05");
    expect(groundDate("present", text)).toBe("present");
    expect(groundDate("2020-02", "salí de Globant en marzo de 2020")).toBe("2020-03");
  });
});

describe("isHighlightGrounded", () => {
  it("accepts paraphrases and rejects inventions", () => {
    expect(isHighlightGrounded("Migré una aplicación a TypeScript", text)).toBe(true);
    expect(isHighlightGrounded("Gestión y liderazgo de equipo de desarrollo frontend", text)).toBe(false);
    expect(isHighlightGrounded("Aumenté las ventas un 40 %", text)).toBe(false);
  });
});

describe("grounding", () => {
  it("keeps entities mentioned in the text", () => {
    expect(isGrounded("Globant S.A.", text)).toBe(true);
    expect(isGrounded("Horizon Technologies", text)).toBe(false);
  });

  it("filters invented entries but tolerates translations", () => {
    const x = groundExtraction(
      {
        experience: [{ company: "Globant" }, { company: "Google" }],
        education: [{ institution: "National University" }, { institution: "MIT" }],
        certifications: [{ name: "Engineering" }],
        languages: [{ language: "French", fluency: "Basic" }, { language: "German" }],
        skills: ["React", "TypeScript", "Kubernetes"],
      },
      text,
    );
    expect(x.experience?.map((e) => e.company)).toEqual(["Globant"]);
    expect(x.education?.map((e) => e.institution)).toEqual(["National University"]);
    expect(x.certifications).toEqual([]);
    expect(x.languages?.map((l) => l.language)).toEqual(["French"]);
    expect(x.skills).toEqual(["React", "TypeScript"]);
  });
});
