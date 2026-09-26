import { z } from "zod";

export const moderationVerdictSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export type ModerationVerdict = z.infer<typeof moderationVerdictSchema>;

export function parseModerationVerdict(value: unknown): ModerationVerdict | null {
  const parsed = moderationVerdictSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}
