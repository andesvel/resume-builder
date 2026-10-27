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

describe("chunkText", () => {
  it("splits long text under the limit", () => {
    const text = Array.from({ length: 50 }, (_, i) => `Sentence number ${i} about work.`).join(" ");
    const chunks = chunkText(text, 200);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
  });
});
