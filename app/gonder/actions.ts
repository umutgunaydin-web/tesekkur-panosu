"use server";

import { after } from "next/server";

import { getClientHash } from "@/lib/client-hash";
import { isSupabaseConfigured } from "@/lib/env";
import { minutesAgoIso, SUBMIT_LIMIT } from "@/lib/limits";
import { pickRandomTheme } from "@/lib/message-theme";
import { moderateRecognition } from "@/lib/moderation/moderate";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { thanksFormSchema, type ThanksFormValues } from "@/lib/validation";

export type SubmitThanksResult =
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitThanksMessage(
  values: ThanksFormValues,
): Promise<SubmitThanksResult> {
  const parsed = thanksFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Form bilgileri geçersiz, lütfen alanları kontrol et.",
    };
  }

  const supabase = isSupabaseConfigured() ? getSupabaseAdminClient() : null;

  if (!supabase) {
    return {
      status: "error",
      message:
        "Supabase bağlantısı yapılandırılmamış. Lütfen sistem yöneticisine haber ver.",
    };
  }

  const clientHash = await getClientHash();

  if (clientHash) {
    const { count } = await supabase
      .from("thanks_messages")
      .select("id", { count: "exact", head: true })
      .eq("client_hash", clientHash)
      .gte("created_at", minutesAgoIso(SUBMIT_LIMIT.windowMinutes));

    if ((count ?? 0) >= SUBMIT_LIMIT.max) {
      return {
        status: "error",
        message: "Kısa sürede çok fazla teşekkür gönderildi. Birkaç dakika sonra tekrar dene.",
      };
    }
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, name")
    .eq("id", parsed.data.recipient_employee_id)
    .eq("is_active", true)
    .maybeSingle();

  if (employeeError || !employee) {
    return {
      status: "error",
      message: "Seçilen çalışan listede yok. Lütfen yeniden seç.",
    };
  }

  const recognitionId = crypto.randomUUID();
  const { error } = await supabase.from("thanks_messages").insert({
    id: recognitionId,
    sender: parsed.data.sender,
    receiver: employee.name,
    recipient_employee_id: employee.id,
    category_tag: parsed.data.category_tag,
    message: parsed.data.message,
    color_theme: pickRandomTheme(),
    status: "pending",
    client_hash: clientHash,
  });

  if (error) {
    console.error("[thanks_messages] kayıt başarısız:", error.message);
    return {
      status: "error",
      message: "Teşekkür gönderilemedi. Lütfen tekrar deneyin.",
    };
  }

  // Cevap insert bitince döner. Moderasyon bu isteği uzatmaz.
  after(async () => {
    try {
      await moderateRecognition(recognitionId);
    } catch (moderationError) {
      console.error("[moderation] arka plan hatası:", moderationError);
    }
  });

  return { status: "success" };
}
