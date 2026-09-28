import { z } from "zod";

function normalizeVerdict(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const raw = value as Record<string, unknown>;
  let decision = raw.decision;
  if (typeof decision === "string") decision = decision.trim().toUpperCase();

  let confidence = raw.confidence;
  if (typeof confidence === "string") {
    const parsed = Number(confidence.trim());
    confidence = Number.isFinite(parsed) ? parsed : confidence;
  }
  if (typeof confidence === "number" && confidence > 1 && confidence <= 100) {
    confidence = confidence / 100;
  }

  return { ...raw, decision, confidence };
}

export const moderationVerdictSchema = z.preprocess(
  normalizeVerdict,
  z.object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().min(1).max(500),
    confidence: z.number().min(0).max(1),
  }),
);

export type ModerationVerdict = z.infer<typeof moderationVerdictSchema>;

export function parseModerationPayload(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("invalid_json");

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("invalid_json");
    return JSON.parse(match[0]);
  }
}

export function parseModerationVerdict(value: unknown): ModerationVerdict | null {
  const parsed = moderationVerdictSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}
