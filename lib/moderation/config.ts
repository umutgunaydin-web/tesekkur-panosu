/** Düşük gecikmeli sınıflandırma modeli. Değiştirilecek tek yer burası. */
export const GEMINI_MODERATION_MODEL = "gemini-3.8-flash";

/** Birincil model yoğunluktan (429/503) yanıt vermezse son deneme bu modelle yapılır. */
export const GEMINI_FALLBACK_MODEL = "gemini-3.7-flash";

import { ThinkingLevel } from "@google/genai";

/** Bu model MINIMAL kabul etmiyor; sınıflandırma için LOW yeterli. */
export const GEMINI_THINKING_LEVEL = ThinkingLevel.LOW;

export const MODERATION_TIMEOUT_MS = 20_000;

/** Geçici 429/503 yanıtlarında bir kez daha denenir. */
export const MODERATION_RETRY_DELAY_MS = 1_500;
