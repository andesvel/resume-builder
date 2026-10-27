import { describe, expect, it } from "vitest";

import { createResume } from "~/features/resume/factory";

import type { LlmEngine } from "./engine";
import { applyFreeText, chunkText } from "./extract";

const fakeEngine = (reply: unknown): LlmEngine => ({
  id: "chrome",
  label: "fake",
  generateJson: async () => reply,
  generateText: async () => "",
  dispose: () => {},
});

describe("applyFreeText", () => {
  it("merges model output and lets regex contacts win", async () => {
    const engine = fakeEngine({ name: "John Doe", email: "john@mail.con", experience: [{ company: "Acme", role: null }] });
    const { resume, summary } = await applyFreeText(engine, createResume(), "Soy John Doe, john@mail.com, trabajé en Acme");
    expect(resume.basics.email).toBe("john@mail.com");
    expect(resume.experience[0]?.company).toBe("Acme");
    expect(summary.added.experience).toBe(1);
  });

  it("survives malformed model output", async () => {
    const { resume } = await applyFreeText(fakeEngine({ name: 42, skills: ["Go"] }), createResume(), "I know Go");
    expect(resume.skills[0]?.keywords).toEqual(["Go"]);
    expect(resume.basics.name).toBe("");
  });
});

describe("follow-up inputs", () => {
  it("don't overwrite profile fields without a cue", async () => {
    const base = createResume({ basics: { name: "Andres Velez", location: "Medellín" } });
    const engine = fakeEngine({ name: "Globant", location: "Globant", experience: [{ company: "Globant", endDate: "2020-02" }] });
    const { resume } = await applyFreeText(engine, base, "En realidad salí de Globant en marzo de 2020");
    expect(resume.basics).toMatchObject({ name: "Andres Velez", location: "Medellín" });
    expect(resume.experience[0]?.endDate).toBe("2020-03");
  });

  it("replace a field when the text is about it", async () => {
    const base = createResume({ basics: { location: "Medellín" } });
    const { resume } = await applyFreeText(fakeEngine({ location: "Madrid, España" }), base, "Ahora vivo en Madrid, España");
    expect(resume.basics.location).toBe("Madrid, España");
  });
});

describe("chunkText", () => {
  it("splits long text under the limit", () => {
    const text = Array.from({ length: 50 }, (_, i) => `Sentence number ${i} about work.`).join(" ");
    const chunks = chunkText(text, 200);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
  });
});
