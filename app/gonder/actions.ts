"use server";

import { after } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { pickRandomTheme } from "@/lib/message-theme";
import { moderateRecognition } from "@/lib/moderation/moderate";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ANONYMOUS_SENDER } from "@/lib/types";
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

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase bağlantısı yapılandırılmamış. Lütfen sistem yöneticisine haber ver.",
    };
  }

  const supabase = getSupabaseServerClient();
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
    sender: parsed.data.is_anonymous ? ANONYMOUS_SENDER : parsed.data.sender,
    receiver: employee.name,
    recipient_employee_id: employee.id,
    category_tag: parsed.data.category_tag,
    message: parsed.data.message,
    color_theme: pickRandomTheme(),
  });

  if (error) {
    console.error("[thanks_messages] kayıt başarısız:", error.message);
    return {
      status: "error",
      message: "Teşekkür gönderilemedi. Lütfen tekrar deneyin.",
    };
  }

  // Cevap insert bitince döner. Gemini bu isteği uzatmaz.
  after(async () => {
    try {
      await moderateRecognition(recognitionId);
    } catch (moderationError) {
      console.error("[moderation] arka plan hatası:", moderationError);
    }
  });

  return { status: "success" };
}
