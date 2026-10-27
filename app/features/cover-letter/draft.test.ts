import { describe, expect, it } from "vitest";

import { createResume, createSampleResume } from "~/features/resume/factory";

import { cleanDraft, coverLetterPrompt, resumeFacts } from "./draft";

describe("cover letter draft", () => {
  it("builds a compact fact sheet from the resume", () => {
    const facts = resumeFacts(createSampleResume("en"));
    expect(facts).toContain("Job: Staff Software Engineer at Horizon Technologies (Jan 2023 – Present)");
    expect(facts.length).toBeLessThanOrEqual(1800);
  });

  it("asks for the resume's language and includes the job", () => {
    const resume = createResume({ locale: "es", coverLetter: { role: "Frontend", company: "Acme", jobDescription: "React" } });
    const { system, prompt } = coverLetterPrompt(resume);
    expect(system).toContain("en español");
    expect(prompt).toContain("Empresa: Acme");
    expect(prompt).toContain("Descripción de la vacante:\nReact");
  });

  it("strips greeting, sign-off and fills company placeholders", () => {
    const resume = createResume({ coverLetter: { company: "Acme" } });
    const text = "Dear Hiring Manager,\n\nI want to join [Company Name].\n\nSincerely,\nJane";
    expect(cleanDraft(text, resume)).toBe("I want to join Acme.");
    expect(cleanDraft("Why this role: I love it.\n\nClosing line: Thanks.", resume)).toBe("I love it.\n\nThanks.");
  });
});
