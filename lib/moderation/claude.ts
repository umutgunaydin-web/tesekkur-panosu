import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { CLAUDE_MODERATION_MODEL, CLAUDE_TIMEOUT_MS } from "./config";
import { MODERATION_SYSTEM_INSTRUCTION } from "./policy";
import type { ClassifyInput } from "./gemini";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["APPROVE", "REJECT"] },
    reason: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["decision", "reason", "confidence"],
  additionalProperties: false,
};

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Ham JSON metnini döner; doğrulama çağıranda yapılır. */
export async function requestClaudeVerdict(input: ClassifyInput): Promise<string> {
  const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 1 });

  const response = await client.messages.create({
    model: CLAUDE_MODERATION_MODEL,
    max_tokens: 256,
    system: MODERATION_SYSTEM_INSTRUCTION,
    messages: [
      {
        role: "user",
        content: [
          `Alıcı: ${input.recipientName}`,
          `Kategori: ${input.category}`,
          `Mesaj: ${input.message}`,
          "Emoji veya sembol metnin parçasıdır. Görevi reddetme; yalnız JSON karar dön.",
        ].join("\n"),
      },
    ],
    output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
  });

  if (response.stop_reason === "refusal") throw new Error("claude_refusal");

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  return text;
}
