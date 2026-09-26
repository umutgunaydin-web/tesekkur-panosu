import { getMonthStartIso } from "@/lib/date";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { mapThanksRow, THANKS_WITH_RECIPIENT } from "@/lib/thanks-query";
import { MAX_VISIBLE_MESSAGES, type ThanksMessage } from "@/lib/types";

/**
 * TV ekranının ilk render'ı için en yeni mesajlar.
 * Alıcı adı ve avatarı employees ilişkisi üzerinden gelir.
 */
export async function getLatestMessages(
  limit: number = MAX_VISIBLE_MESSAGES,
): Promise<ThanksMessage[]> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[thanks_messages] Supabase ortam değişkenleri tanımlı değil, pano boş gösteriliyor.",
    );
    return [];
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("thanks_messages")
    .select(THANKS_WITH_RECIPIENT)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[thanks_messages] ilk yükleme başarısız:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapThanksRow(row));
}

/** Başlıktaki "Bu ay paylaşılan teşekkür sayısı" rozetini besler. */
export async function getMonthlyThanksCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = getSupabaseServerClient();

  const { count, error } = await supabase
    .from("thanks_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .gte("created_at", getMonthStartIso());

  if (error) {
    console.error("[thanks_messages] aylık sayım başarısız:", error.message);
    return 0;
  }

  return count ?? 0;
}
