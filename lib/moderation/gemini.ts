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
import { isGemmaConfigured, requestGemmaVerdict } from "./gemma";
import { localModerationVerdict } from "./local";
import type { ModerationProvider } from "@/lib/types";

import { MODERATION_SYSTEM_INSTRUCTION } from "./policy";
import {
  parseModerationPayload,
  parseModerationVerdict,
  type ModerationVerdict,
} from "./verdict";

export type ClassifiedVerdict = {
  verdict: ModerationVerdict;
  provider: ModerationProvider;
};

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

function errorTypeOf(error: unknown): string {
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return `api_${status}`;
  return error instanceof Error ? error.name === "TimeoutError" ? "timeout" : error.message : "unknown";
}

/** Bir sağlayıcıya sorar; geçerli karar yoksa null döner ve nedeni loglar. */
async function tryProvider(
  provider: ModerationProvider,
  request: () => Promise<string>,
): Promise<ModerationVerdict | null> {
  try {
    const verdict = parseModerationVerdict(parseModerationPayload(await request()));
    if (verdict) return verdict;
    console.warn("[moderation]", { provider, errorType: "invalid_response" });
  } catch (error) {
    console.warn("[moderation]", { provider, errorType: errorTypeOf(error) });
  }
  return null;
}

/**
 * Sırayla Gemma (ekip sunucusu), Claude ve Gemini'ye sorar; ilk geçerli
 * karar kullanılır. Kararı hangi sağlayıcının verdiği kayda yazılır.
 */
export async function classifyRecognition(
  input: ClassifyInput,
  options: { allowClaude: boolean },
): Promise<ClassifiedVerdict> {
  const local = localModerationVerdict(input.message);
  if (local) return { verdict: local, provider: "local" };

  if (isGemmaConfigured()) {
    const verdict = await tryProvider("gemma", () => requestGemmaVerdict(input));
    if (verdict) return { verdict, provider: "gemma" };
  }

  if (options.allowClaude && isClaudeConfigured()) {
    const verdict = await tryProvider("claude", () => requestClaudeVerdict(input));
    if (verdict) return { verdict, provider: "claude" };
  }

  return { verdict: await classifyWithGemini(input), provider: "gemini" };
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
