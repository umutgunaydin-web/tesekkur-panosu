import { ThinkingLevel } from "@google/genai";

/** Birincil moderasyon modeli. Ücretli hesap; Gemini yalnız yedek. */
export const CLAUDE_MODERATION_MODEL = "claude-haiku-4-5";

/** SDK bir kez yeniden dener; iki deneme birlikte ~20 sn'yi geçmez. */
export const CLAUDE_TIMEOUT_MS = 10_000;

/**
 * Claude yanıt veremezse sırayla denenen Gemini modelleri. Her modelin kotası ve yoğunluğu ayrıdır; biri
 * 429/503 dönerse aynı modeli zorlamak yerine sıradakine geçilir.
 * Birincil model değiştirilecekse yalnızca ilk eleman değişir.
 */
export const GEMINI_MODEL_CHAIN = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
] as const;

/** Yalnız birincil modelde kullanılır; yedekler düşünmeden sınıflandırır. */
export const GEMINI_THINKING_LEVEL = ThinkingLevel.LOW;

/** Claude + üç Gemini denemesi + beklemeler sayfanın 60 sn sınırına sığmalı. */
export const MODERATION_TIMEOUT_MS = 10_000;

/** Denemeler arasında beklenir. İkinci aralık bunun iki katıdır. */
export const MODERATION_RETRY_DELAY_MS = 1_000;
