/** İçinde bulunulan ayın ilk gününün ISO karşılığı (aylık sayaç sorgusu için). */
export function getMonthStartIso(reference: Date = new Date()): string {
  const monthStart = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  return monthStart.toISOString();
}
