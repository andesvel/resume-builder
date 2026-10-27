import { z } from "zod";

/**
 * What the model is asked to return: a deliberately small, flat shape that
 * small on-device models fill reliably. It is merged into the resume by code
 * (see merge.ts), never trusted as a whole resume.
 */
const s = () => z.string().optional();

export const extractionSchema = z.object({
  name: s(),
  headline: s(),
  email: s(),
  phone: s(),
  location: s(),
  summary: s(),
  links: z.array(z.object({ label: s(), url: s() })).optional(),
  experience: z
    .array(
      z.object({
        company: s(),
        role: s(),
        location: s(),
        startDate: s(),
        endDate: s(),
        current: z.boolean().optional(),
        highlights: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  education: z
    .array(z.object({ institution: s(), degree: s(), field: s(), startDate: s(), endDate: s() }))
    .optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.object({ language: s(), fluency: s() })).optional(),
  projects: z.array(z.object({ name: s(), url: s(), description: s() })).optional(),
  certifications: z.array(z.object({ name: s(), issuer: s(), date: s() })).optional(),
});

export type Extraction = z.infer<typeof extractionSchema>;

/** JSON Schema handed to the engines for constrained decoding. */
export function extractionJsonSchema(): object {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(extractionSchema) as Record<string, unknown>;
  return schema;
}

/** Models sometimes return nulls or wrong types; coerce what we can, drop the rest. */
export function parseExtraction(raw: unknown): Extraction {
  const cleaned = JSON.parse(JSON.stringify(raw ?? {}, (_k, v: unknown) => (v === null || v === "" ? undefined : v)));
  const result = extractionSchema.safeParse(cleaned);
  if (result.success) return result.data;
  // Keep the valid top-level keys only.
  const partial: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(cleaned as object)) {
    const field = extractionSchema.shape[key as keyof Extraction];
    if (field?.safeParse(value).success) partial[key] = value;
  }
  return extractionSchema.parse(partial);
}
