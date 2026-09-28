import { parseModerationVerdict, type ModerationVerdict } from "./verdict";

export const MODERATION_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sınıflandırmayı en fazla 3 kez dener. Süre, yoğunluk veya bozuk JSON
 * tek denemede moderasyon hatasına düşürmesin.
 */
export async function runModerationAttempts(
  run: (attempt: number) => Promise<unknown>,
  options?: {
    attempts?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<ModerationVerdict> {
  const attempts = options?.attempts ?? MODERATION_ATTEMPTS;
  const delayMs = options?.delayMs ?? 0;
  const wait = options?.sleep ?? sleep;
  let lastError: unknown = new Error("invalid_response");

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const verdict = parseModerationVerdict(await run(attempt));
      if (verdict) return verdict;
      lastError = new Error("invalid_response");
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts && delayMs > 0) {
      await wait(delayMs * attempt);
    }
  }

  throw lastError;
}
