import { describe, expect, it } from "vitest";

import { parseJsonReply, stripReasoning } from "./output";

describe("model output", () => {
  it("drops empty and filled think blocks", () => {
    expect(parseJsonReply('<think>\n\n</think>\n\n{"name":"A"}')).toEqual({ name: "A" });
    expect(parseJsonReply('<think>hmm {x}</think>{"a":1}')).toEqual({ a: 1 });
    expect(stripReasoning("<think>x</think> Dear team,")).toBe("Dear team,");
  });

  it("handles code fences and rejects non-JSON", () => {
    expect(parseJsonReply('```json\n{"a":[1]}\n```')).toEqual({ a: [1] });
    expect(() => parseJsonReply("sorry")).toThrow(SyntaxError);
  });
});
