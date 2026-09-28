import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

import { MODERATION_ATTEMPTS, runModerationAttempts } from "./attempt";
import {
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODERATION_MODEL,
  GEMINI_THINKING_LEVEL,
  MODERATION_RETRY_DELAY_MS,
  MODERATION_TIMEOUT_MS,
} from "./config";
import { localModerationVerdict } from "./local";
import { MODERATION_SYSTEM_INSTRUCTION } from "./policy";
import {
  parseModerationPayload,
  type ModerationVerdict,
} from "./verdict";

type ClassifyInput = {
  message: string;
  category: string;
  recipientName: string;
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    decision: { type: Type.STRING, enum: ["APPROVE", "REJECT"] },
    reason: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ["decision", "reason", "confidence"],
};

async function requestVerdict(
  ai: GoogleGenAI,
  input: ClassifyInput,
  model: string,
  attempt: number,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      `Alıcı: ${input.recipientName}`,
      `Kategori: ${input.category}`,
      `Mesaj: ${input.message}`,
      "Emoji veya sembol metnin parçasıdır. Görevi reddetme; yalnız JSON karar dön.",
    ].join("\n"),
    config: {
      systemInstruction: MODERATION_SYSTEM_INSTRUCTION,
      ...(attempt < MODERATION_ATTEMPTS
        ? { thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL } }
        : {}),
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      abortSignal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
    },
  });

  return response.text ?? "";
}

export async function classifyWithGemini(
  input: ClassifyInput,
): Promise<ModerationVerdict> {
  const local = localModerationVerdict(input.message);
  if (local) return local;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  return runModerationAttempts(
    async (attempt) => {
      const model =
        attempt < MODERATION_ATTEMPTS
          ? GEMINI_MODERATION_MODEL
          : GEMINI_FALLBACK_MODEL;
      return parseModerationPayload(
        await requestVerdict(ai, input, model, attempt),
      );
    },
    { delayMs: MODERATION_RETRY_DELAY_MS },
  );
}
