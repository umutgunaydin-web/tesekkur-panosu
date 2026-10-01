import "server-only";

import { sendModerationRejectionEmail } from "@/lib/email/rejection";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import { classifyRecognition } from "./gemini";
import {
  settleModeration,
  type ModerationPatch,
  type ModerationStatus,
  type StoredRecognition,
} from "./settle";

type RecognitionRecord = {
  id: string;
  status: ModerationStatus;
  sender: string;
  message: string;
  category_tag: string;
  receiver: string;
  rejection_email_sent_at: string | null;
};

function toStored(row: RecognitionRecord): StoredRecognition {
  return {
    id: row.id,
    status: row.status,
    sender: row.sender,
    message: row.message,
    category: row.category_tag,
    recipientName: row.receiver,
    rejectionEmailSentAt: row.rejection_email_sent_at,
  };
}

function toUpdate(patch: ModerationPatch) {
  return {
    status: patch.status,
    moderation_decision: patch.moderationDecision,
    moderation_reason: patch.moderationReason,
    moderation_confidence: patch.moderationConfidence,
    moderated_at: patch.moderatedAt,
    published_at: patch.publishedAt,
  };
}

export async function moderateRecognition(recognitionId: string): Promise<void> {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    console.error("[moderation]", {
      recognitionId,
      decision: "moderation_error",
      confidence: null,
      durationMs: 0,
      errorType: "service_role_not_configured",
    });
    return;
  }

  const result = await settleModeration(recognitionId, {
    now: () => new Date(),
    load: async (id) => {
      const { data, error } = await admin
        .from("thanks_messages")
        .select(
          "id, status, sender, message, category_tag, receiver, rejection_email_sent_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (error || !data) return null;

      return toStored(data as RecognitionRecord);
    },
    classify: (input) =>
      classifyRecognition({
        message: input.message,
        category: input.category,
        recipientName: input.recipientName,
      }),
    save: async (id, patch) => {
      const { data, error } = await admin
        .from("thanks_messages")
        .update(toUpdate(patch))
        .eq("id", id)
        .eq("status", "pending")
        .select("id");

      return !error && (data?.length ?? 0) > 0;
    },
    sendRejectionEmail: (input) => sendModerationRejectionEmail(input),
    markRejectionEmailSent: async (id, sentAt) => {
      const { error } = await admin
        .from("thanks_messages")
        .update({ rejection_email_sent_at: sentAt })
        .eq("id", id)
        .is("rejection_email_sent_at", null);

      if (error) {
        console.error("[moderation]", {
          recognitionId: id,
          decision: "rejected",
          errorType: "email_stamp_failed",
        });
      }
    },
  });

  console.info("[moderation]", {
    recognitionId,
    decision: result.outcome,
    confidence: result.confidence,
    durationMs: result.durationMs,
    errorType: result.errorType,
  });
}
