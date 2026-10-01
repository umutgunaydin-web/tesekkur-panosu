/**
 * Ofis tek IP'den çıktığı için sınırlar kişi değil bina ölçeğinde düşünülür.
 * Gerçek kullanımda dakikada en fazla 2 gönderim görüldü.
 */
export const SUBMIT_LIMIT = { windowMinutes: 10, max: 20 } as const;

export const REACTION_LIMIT = { windowMinutes: 10, max: 120 } as const;

/** Bu sayıdan sonra gün sonuna kadar moderasyon ücretsiz Gemini ile yapılır. */
export const CLAUDE_DAILY_LIMIT = 200;

export function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** İstanbul saatiyle bugünün başlangıcı (UTC+3, yaz saati yok). */
export function istanbulDayStartIso(now = new Date()): string {
  const shifted = new Date(now.getTime() + 3 * 3_600_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 3 * 3_600_000).toISOString();
}
