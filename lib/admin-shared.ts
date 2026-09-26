import type { ModerationStatus } from "@/lib/types";

export const ADMIN_PAGE_SIZE = 25;

export type AdminRecognition = {
  id: string;
  message: string;
  sender: string;
  receiver: string;
  category_tag: string;
  created_at: string;
  status: ModerationStatus;
  moderation_decision: string | null;
  moderation_reason: string | null;
  moderation_confidence: number | null;
  moderated_at: string | null;
  published_at: string | null;
  removed_at: string | null;
  remove_reason: string | null;
  recipient: { id: string; name: string; avatar_url: string | null } | null;
};
