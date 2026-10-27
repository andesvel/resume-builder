/** Remove reasoning blocks some models (Qwen3) emit even with thinking disabled. */
export function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^[\s\S]*?<\/think>/, "").trim();
}

/** Parse the JSON object in a model reply, tolerating reasoning blocks and code fences around it. */
export function parseJsonReply(text: string): unknown {
  const body = stripReasoning(text).replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end < start) throw new SyntaxError("No JSON object in model reply");
  return JSON.parse(body.slice(start, end + 1));
}
