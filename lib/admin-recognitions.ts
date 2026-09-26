import "server-only";

import { ADMIN_PAGE_SIZE, type AdminRecognition } from "@/lib/admin-shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ModerationStatus } from "@/lib/types";

export { ADMIN_PAGE_SIZE, type AdminRecognition };

const SELECT = `
  id,
  message,
  sender,
  receiver,
  category_tag,
  created_at,
  status,
  moderation_decision,
  moderation_reason,
  moderation_confidence,
  moderated_at,
  published_at,
  removed_at,
  remove_reason,
  recipient:employees!recipient_employee_id (
    id,
    name,
    avatar_url
  )
`;

export type AdminListQuery = {
  status?: string;
  q?: string;
  page?: number;
};

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,]/g, " ").trim();
}

export async function listAdminRecognitions(query: AdminListQuery) {
  const admin = getSupabaseAdminClient();
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  if (!admin) {
    return { rows: [] as AdminRecognition[], count: 0, page };
  }

  let request = admin
    .from("thanks_messages")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (
    query.status &&
    ["approved", "pending", "rejected", "removed", "moderation_error"].includes(
      query.status,
    )
  ) {
    request = request.eq("status", query.status as ModerationStatus);
  }

  const search = query.q ? sanitizeSearch(query.q) : "";
  if (search) {
    request = request.or(
      `message.ilike.%${search}%,sender.ilike.%${search}%,receiver.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await request;

  if (error) {
    console.error("[admin] liste okunamadı:", error.message);
    return { rows: [] as AdminRecognition[], count: 0, page };
  }

  const rows = (data ?? []).map((row) => {
    const recipient = Array.isArray(row.recipient)
      ? (row.recipient[0] ?? null)
      : row.recipient;

    return { ...row, recipient } as AdminRecognition;
  });

  return { rows, count: count ?? 0, page };
}

export async function countByStatus() {
  const admin = getSupabaseAdminClient();
  const empty = {
    approved: 0,
    pending: 0,
    rejected: 0,
    removed: 0,
    moderation_error: 0,
  };

  if (!admin) return empty;

  const statuses = Object.keys(empty) as (keyof typeof empty)[];
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await admin
        .from("thanks_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", status);

      return [status, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(counts) as typeof empty;
}
