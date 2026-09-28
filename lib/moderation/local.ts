import type { ModerationVerdict } from "./verdict";

/** Harf içermeyen mesaj Gemini'ye gitmez. Yalnız emoji veya sembol hata üretmesin. */
export function localModerationVerdict(message: string): ModerationVerdict | null {
  if (/\p{L}/u.test(message)) return null;

  return {
    decision: "REJECT",
    reason:
      "Mesaj anlamlı bir takdir cümlesi içermeyen sembol veya emojilerden oluşuyor.",
    confidence: 1,
  };
}
