import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

import {
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODERATION_MODEL,
  GEMINI_THINKING_LEVEL,
  MODERATION_RETRY_DELAY_MS,
  MODERATION_TIMEOUT_MS,
} from "./config";
import { MODERATION_SYSTEM_INSTRUCTION } from "./policy";
import { parseModerationVerdict, type ModerationVerdict } from "./verdict";

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

function isTransient(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 429 || status === 503) return true;

  const message = error instanceof Error ? error.message : "";
  return message.includes('"code":429') || message.includes('"code":503');
}

async function requestVerdict(
  ai: GoogleGenAI,
  input: ClassifyInput,
  model: string,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      `Alıcı: ${input.recipientName}`,
      `Kategori: ${input.category}`,
      `Mesaj: ${input.message}`,
    ].join("\n"),
    config: {
      systemInstruction: MODERATION_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL },
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const attempts = [
    GEMINI_MODERATION_MODEL,
    GEMINI_MODERATION_MODEL,
    GEMINI_FALLBACK_MODEL,
  ];
  let text = "";

  for (let index = 0; index < attempts.length; index += 1) {
    try {
      text = await requestVerdict(ai, input, attempts[index]);
      break;
    } catch (error) {
      const isLast = index === attempts.length - 1;
      if (isLast || !isTransient(error)) throw error;

      await new Promise((resolve) =>
        setTimeout(resolve, MODERATION_RETRY_DELAY_MS),
      );
    }
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("invalid_json");
  }

  const verdict = parseModerationVerdict(parsed);

  if (!verdict) {
    throw new Error("invalid_response");
  }

  return verdict;
}
