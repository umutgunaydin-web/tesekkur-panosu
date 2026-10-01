import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

import { runModerationAttempts } from "./attempt";
import {
  GEMINI_MODEL_CHAIN,
  GEMINI_THINKING_LEVEL,
  MODERATION_RETRY_DELAY_MS,
  MODERATION_TIMEOUT_MS,
} from "./config";
import { isClaudeConfigured, requestClaudeVerdict } from "./claude";
import { localModerationVerdict } from "./local";
import { MODERATION_SYSTEM_INSTRUCTION } from "./policy";
import {
  parseModerationPayload,
  parseModerationVerdict,
  type ModerationVerdict,
} from "./verdict";

export type ClassifyInput = {
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
      ...(attempt === 1
        ? { thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL } }
        : {}),
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      abortSignal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
    },
  });

  return response.text ?? "";
}

/**
 * Önce Claude'a sorar; yanıt yoksa veya geçersizse Gemini zincirine düşer.
 * Hangi sağlayıcının karar verdiği loglanır.
 */
export async function classifyRecognition(
  input: ClassifyInput,
): Promise<ModerationVerdict> {
  const local = localModerationVerdict(input.message);
  if (local) return local;

  if (isClaudeConfigured()) {
    try {
      const verdict = parseModerationVerdict(
        parseModerationPayload(await requestClaudeVerdict(input)),
      );
      if (verdict) {
        console.info("[moderation]", { provider: "claude" });
        return verdict;
      }
      console.warn("[moderation]", { provider: "claude", errorType: "invalid_response" });
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      console.warn("[moderation]", {
        provider: "claude",
        errorType: typeof status === "number" ? `api_${status}` : (error as Error).message,
      });
    }
  }

  const verdict = await classifyWithGemini(input);
  console.info("[moderation]", { provider: "gemini" });
  return verdict;
}

async function classifyWithGemini(
  input: ClassifyInput,
): Promise<ModerationVerdict> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  return runModerationAttempts(
    async (attempt) => {
      const model = GEMINI_MODEL_CHAIN[attempt - 1] ?? GEMINI_MODEL_CHAIN[0];
      return parseModerationPayload(
        await requestVerdict(ai, input, model, attempt),
      );
    },
    { attempts: GEMINI_MODEL_CHAIN.length, delayMs: MODERATION_RETRY_DELAY_MS },
  );
}
