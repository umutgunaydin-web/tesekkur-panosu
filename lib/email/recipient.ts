import "server-only";

import { getSiteUrl } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import { sendWithResend } from "./send";
import { buildRecipientEmail } from "./template";

/**
 * Yayına giren teşekkürü alıcıya e-postayla bildirir. Her kayıt için bir kez
 * gönderilir; e-posta hatası yayını etkilemez, yalnız loglanır.
 */
export async function notifyRecipient(recognitionId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const { data: row } = await admin
    .from("thanks_messages")
    .select(
      "id, status, sender, message, category_tag, recipient_email_sent_at, recipient:employees!recipient_employee_id (name, email)",
    )
    .eq("id", recognitionId)
    .maybeSingle();

  const recipient = Array.isArray(row?.recipient) ? row.recipient[0] : row?.recipient;

  if (!row || row.status !== "approved" || row.recipient_email_sent_at || !recipient?.email) {
    return;
  }

  // Önce işaretle: eşzamanlı iki çağrı aynı kişiye iki e-posta atmasın.
  const sentAt = new Date().toISOString();
  const { data: claimed } = await admin
    .from("thanks_messages")
    .update({ recipient_email_sent_at: sentAt })
    .eq("id", recognitionId)
    .is("recipient_email_sent_at", null)
    .select("id");

  if (!claimed?.length) return;

  const email = buildRecipientEmail({
    recipientName: recipient.name,
    senderName: row.sender,
    category: row.category_tag,
    message: row.message,
    wallUrl: `${getSiteUrl()}/pano`,
  });

  try {
    await sendWithResend(recipient.email, email.subject, email.text);
  } catch (error) {
    await admin
      .from("thanks_messages")
      .update({ recipient_email_sent_at: null })
      .eq("id", recognitionId);
    console.error("[recipient-email]", {
      recognitionId,
      errorType: error instanceof Error ? error.message : "unknown",
    });
  }
}
