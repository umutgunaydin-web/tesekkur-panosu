/**
 * Kültür ekranındaki teşekkür şeridinin sıralama kuralları. Şerit aşağı akar;
 * üstten giren kart DOM'da bir yukarıdaki karttır. Liste eskiden yeniye
 * dizildiğinde kartlar en yeniden eskiye doğru girer.
 */

/** Yeni gelen teşekkür şeridin üstünde bu kadar sabit durur; aynı anda yalnız bir mesaj. */
export const PIN_MS = 60_000;
/** Yoğun anlarda sırada bundan uzun bekleyecek mesaj sabitlenmeden akışa katılır. */
export const MAX_PIN_WAIT_MS = 5 * 60_000;

type StripItem = { id: string; created_at: string };

/** Mesajın ekrana geldiği an: oturumda sonradan gelenler için geliş anı, ilk yüklemede oluşturulma zamanı. */
export function arrivalTime(item: StripItem, arrivals: ReadonlyMap<string, number>): number {
  return arrivals.get(item.id) ?? new Date(item.created_at).getTime();
}

/**
 * Yeni gelenler geliş sırasıyla tek sabit alanı 1'er dakika kullanır.
 * Sırası gelmemiş mesajlar akışta da görünmez (ekranda iki kez çıkmasın);
 * çok bekleyecek olanlar sırayı atlayıp doğrudan akışa katılır.
 */
export function schedulePinned<T extends StripItem>(
  messages: T[],
  arrivals: ReadonlyMap<string, number>,
  now: number,
  pinMs = PIN_MS,
  maxWaitMs = MAX_PIN_WAIT_MS,
): { pinned: T | null; waiting: T[]; flow: T[] } {
  const candidates = messages
    .filter((item) => now - arrivalTime(item, arrivals) < maxWaitMs + pinMs)
    .sort((a, b) => arrivalTime(a, arrivals) - arrivalTime(b, arrivals) || a.id.localeCompare(b.id));

  let pinned: T | null = null;
  const waiting: T[] = [];
  let slotFree = -Infinity;

  for (const item of candidates) {
    const arrived = arrivalTime(item, arrivals);
    const start = Math.max(arrived, slotFree);
    if (start - arrived > maxWaitMs) continue;
    slotFree = start + pinMs;
    if (now >= start && now < start + pinMs) pinned = item;
    else if (now < start) waiting.push(item);
  }

  const held = new Set([...(pinned ? [pinned.id] : []), ...waiting.map((item) => item.id)]);
  const flow = messages
    .filter((item) => !held.has(item.id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return { pinned, waiting, flow };
}

/**
 * Akıştan düşen mesaj yönetici tarafından mı kaldırıldı? Liste 30 ile sınırlı
 * olduğu için en eski mesajlar da düşer; onlar tur sonunu bekleyebilir,
 * kaldırılanlar beklememeli.
 */
export function hasDeliberateRemoval<T extends StripItem>(current: T[], next: T[]): boolean {
  const nextIds = new Set(next.map((item) => item.id));
  const removed = current.filter((item) => !nextIds.has(item.id));
  if (removed.length === 0 || next.length === 0) return removed.length > 0 && next.length === 0;

  const oldestRemaining = next.reduce(
    (min, item) => (item.created_at < min ? item.created_at : min),
    next[0].created_at,
  );
  return removed.some((item) => item.created_at > oldestRemaining);
}

export function sameOrder<T extends StripItem>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item, index) => item.id === b[index].id);
}
