import "server-only";

import { GEMMA_TIMEOUT_MS } from "./config";
import { MODERATION_SYSTEM_INSTRUCTION } from "./policy";
import type { ClassifyInput } from "./gemini";

/**
 * Ekibin Mac mini'sindeki Gemma, OpenAI uyumlu ağ geçidi üzerinden
 * (LOCAL_LLM_URL / LOCAL_LLM_API_KEY / LOCAL_LLM_MODEL). Kota dakikada 20
 * istek; dolarsa ya da yanıt gecikirse zincir beklemeden Claude'a geçer.
 */
export function isGemmaConfigured(): boolean {
  return Boolean(
    process.env.LOCAL_LLM_URL && process.env.LOCAL_LLM_API_KEY && process.env.LOCAL_LLM_MODEL,
  );
}

/** Adres taban (…/v1) ya da tam uç nokta (…/v1/chat/completions) olarak verilebilir. */
export function chatCompletionsUrl(raw: string): string {
  const base = raw.trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
  return `${base}/chat/completions`;
}

/** Ham metni döner; JSON çıkarma ve doğrulama çağıranda yapılır. */
export async function requestGemmaVerdict(input: ClassifyInput): Promise<string> {
  const response = await fetch(chatCompletionsUrl(process.env.LOCAL_LLM_URL!), {
    method: "POST",
    signal: AbortSignal.timeout(GEMMA_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${process.env.LOCAL_LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LOCAL_LLM_MODEL,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: MODERATION_SYSTEM_INSTRUCTION },
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
    }),
  });

  if (!response.ok) {
    throw Object.assign(new Error(`gemma_${response.status}`), { status: response.status });
  }

  const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
  return String(body.choices?.[0]?.message?.content ?? "");
}
