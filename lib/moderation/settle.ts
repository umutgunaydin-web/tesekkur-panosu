import { localModerationVerdict } from "./local";
import { parseModerationVerdict, type ModerationVerdict } from "./verdict";

const MODERATION_FAILURE_REASON = "Moderasyon servisi yanıt veremedi.";

export type ModerationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "moderation_error";

export type StoredRecognition = {
  id: string;
  status: ModerationStatus;
  sender: string;
  message: string;
  category: string;
  recipientName: string;
  rejectionEmailSentAt: string | null;
};

export type ModerationPatch = {
  status: Exclude<ModerationStatus, "pending">;
  moderationDecision: "APPROVE" | "REJECT" | null;
  moderationReason: string | null;
  moderationConfidence: number | null;
  moderatedAt: string;
  publishedAt: string | null;
};

export type SettleResult = {
  outcome: ModerationStatus | "skipped";
  confidence: number | null;
  durationMs: number;
  errorType: string | null;
  emailSent: boolean;
};

type ClassifyInput = {
  recognitionId: string;
  message: string;
  category: string;
  recipientName: string;
};

export type ModerationPorts = {
  now: () => Date;
  load: (recognitionId: string) => Promise<StoredRecognition | null>;
  classify: (input: ClassifyInput) => Promise<unknown>;
  save: (recognitionId: string, patch: ModerationPatch) => Promise<boolean>;
  sendRejectionEmail: (input: {
    senderName: string;
    recipientName: string;
    category: string;
    message: string;
    moderationReason: string;
    moderationConfidence: number;
  }) => Promise<void>;
  markRejectionEmailSent: (recognitionId: string, sentAt: string) => Promise<void>;
};

function errorTypeOf(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";

  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return "timeout";
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return `api_${status}`;
  }

  if (
    error.message === "gemini_not_configured" ||
    error.message === "invalid_json" ||
    error.message === "invalid_response" ||
    error.message === "email_not_configured" ||
    error.message === "admin_email_not_configured" ||
    error.message.startsWith("email_provider_")
  ) {
    return error.message;
  }

  return error.name || "Error";
}

/**
 * Yalnızca pending kaydı işler. Onay, ret ve hata durumları panoya çıkmaz
 * (onay hariç). Ret e-postası başarılı gönderimden sonra işaretlenir.
 */
export async function settleModeration(
  recognitionId: string,
  ports: ModerationPorts,
): Promise<SettleResult> {
  const started = ports.now().getTime();
  const row = await ports.load(recognitionId);

  if (!row || row.status !== "pending") {
    return {
      outcome: "skipped",
      confidence: null,
      durationMs: ports.now().getTime() - started,
      errorType: null,
      emailSent: false,
    };
  }

  let verdict: ModerationVerdict | null = localModerationVerdict(row.message);
  let errorType: string | null = null;

  if (!verdict) {
    try {
      verdict = parseModerationVerdict(
        await ports.classify({
          recognitionId: row.id,
          message: row.message,
          category: row.category,
          recipientName: row.recipientName,
        }),
      );
      if (!verdict) errorType = "invalid_response";
    } catch (error) {
      errorType = errorTypeOf(error);
    }
  }

  const moderatedAt = ports.now().toISOString();
  const patch: ModerationPatch = verdict
    ? {
        status: verdict.decision === "APPROVE" ? "approved" : "rejected",
        moderationDecision: verdict.decision,
        moderationReason: verdict.reason,
        moderationConfidence: verdict.confidence,
        moderatedAt,
        publishedAt: verdict.decision === "APPROVE" ? moderatedAt : null,
      }
    : {
        status: "moderation_error",
        moderationDecision: null,
        moderationReason: MODERATION_FAILURE_REASON,
        moderationConfidence: null,
        moderatedAt,
        publishedAt: null,
      };

  const saved = await ports.save(row.id, patch);

  if (!saved) {
    return {
      outcome: "skipped",
      confidence: verdict?.confidence ?? null,
      durationMs: ports.now().getTime() - started,
      errorType,
      emailSent: false,
    };
  }

  let emailSent = false;

  if (
    patch.status === "rejected" &&
    verdict &&
    row.rejectionEmailSentAt === null
  ) {
    try {
      await ports.sendRejectionEmail({
        senderName: row.sender,
        recipientName: row.recipientName,
        category: row.category,
        message: row.message,
        moderationReason: verdict.reason,
        moderationConfidence: verdict.confidence,
      });
      await ports.markRejectionEmailSent(row.id, ports.now().toISOString());
      emailSent = true;
    } catch (error) {
      errorType = errorTypeOf(error);
    }
  }

  return {
    outcome: patch.status,
    confidence: verdict?.confidence ?? null,
    durationMs: ports.now().getTime() - started,
    errorType,
    emailSent,
  };
}
