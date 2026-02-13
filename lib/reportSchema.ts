import { z } from "zod";

/**
 * Non-breaking schema:
 * - validates key blocks we rely on
 * - allows existing builder output to pass through unchanged
 */
export const NarrativeBlockSchema = z.object({
  tone: z.enum(["gentle", "supportive", "encouraging"]),
  summary: z.string(),
  reflection: z.string(),
  coaching: z.array(z.string()),
});

export const ReportJsonSchema = z
  .object({
    meta: z
      .object({
        version: z.string(),
        generatedAt: z.string(), // ISO string
        windowDays: z.number(),
      })
      .optional(),

    // Legacy/Existing: your builder currently outputs a story string
    story: z.string().optional(),

    // NEW (additive): structured narrative for UI (overall + byPartner)
    narrative: z
    .object({
      overall: NarrativeBlockSchema,
      byPartner: z.record(z.string(), NarrativeBlockSchema).optional(),
    })
    .optional(),  
  })
  .passthrough();

export type ReportJson = z.infer<typeof ReportJsonSchema>;
