import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type RankedRow = { label: string; value: number; avatarUrl?: string | null };

export type MonthlyStats = {
  month: string;
  published: number;
  submitted: number;
  rejected: number;
  recipients: number;
  senders: number;
  reactions: number;
  topRecipients: RankedRow[];
  topSenders: RankedRow[];
  categories: RankedRow[];
  daily: { day: number; value: number }[];
  topReacted: { id: string; recipient: string; sender: string; message: string; total: number }[];
  providers: RankedRow[];
};

/** "2026-10" → İstanbul saatine göre ayın başı ve sonu (UTC+3). */
export function monthRange(month: string): { start: string; end: string; days: number } {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1, -3));
  const end = new Date(Date.UTC(year, monthIndex, 1, -3));
  const days = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  return { start: start.toISOString(), end: end.toISOString(), days };
}

export function currentMonth(now = new Date()): string {
  const shifted = new Date(now.getTime() + 3 * 3_600_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isValidMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

function rank(counts: Map<string, RankedRow>, limit: number): RankedRow[] {
  return [...counts.values()]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "tr"))
    .slice(0, limit);
}

function bump(counts: Map<string, RankedRow>, key: string, label: string, avatarUrl?: string | null) {
  const row = counts.get(key) ?? { label, value: 0, avatarUrl };
  row.value += 1;
  counts.set(key, row);
}

type StatsRow = {
  id: string;
  status: string;
  sender: string;
  receiver: string;
  message: string;
  category_tag: string;
  created_at: string;
  moderation_provider: string | null;
  recipient_employee_id: string | null;
  recipient: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[] | null;
};

export async function getMonthlyStats(month: string): Promise<MonthlyStats | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { start, end, days } = monthRange(month);

  const { data, error } = await admin
    .from("thanks_messages")
    .select(
      "id, status, sender, receiver, message, category_tag, created_at, moderation_provider, recipient_employee_id, recipient:employees!recipient_employee_id (name, avatar_url)",
    )
    .gte("created_at", start)
    .lt("created_at", end)
    .limit(5000);

  if (error) {
    console.error("[admin-stats]", error.message);
    return null;
  }

  const rows = (data ?? []) as StatsRow[];
  // Kaldırılanlar da bir dönem panoda yayınlandı; teşekkür sayımına girer.
  const published = rows.filter((row) => row.status === "approved" || row.status === "removed");

  const recipients = new Map<string, RankedRow>();
  const senders = new Map<string, RankedRow>();
  const categories = new Map<string, RankedRow>();
  const providers = new Map<string, RankedRow>();
  const daily = Array.from({ length: days }, (_, index) => ({ day: index + 1, value: 0 }));

  for (const row of published) {
    const recipient = Array.isArray(row.recipient) ? row.recipient[0] : row.recipient;
    const name = recipient?.name ?? row.receiver;
    bump(recipients, row.recipient_employee_id ?? name, name, recipient?.avatar_url ?? null);
    bump(senders, row.sender.toLocaleLowerCase("tr-TR"), row.sender);
    bump(categories, row.category_tag, row.category_tag);

    const day = new Date(new Date(row.created_at).getTime() + 3 * 3_600_000).getUTCDate();
    daily[day - 1].value += 1;
  }

  const providerLabels: Record<string, string> = {
    claude: "Claude",
    gemini: "Gemini (yedek)",
    local: "Yerel kural",
  };
  for (const row of rows) {
    if (row.moderation_provider) {
      bump(providers, row.moderation_provider, providerLabels[row.moderation_provider] ?? row.moderation_provider);
    }
  }

  const publishedIds = published.map((row) => row.id);
  const { data: reactionRows } = publishedIds.length
    ? await admin
        .from("reaction_counts")
        .select("recognition_id, clap, heart")
        .in("recognition_id", publishedIds)
    : { data: [] };

  const reactionTotals = new Map(
    (reactionRows ?? []).map((row) => [row.recognition_id, row.clap + row.heart]),
  );

  const topReacted = published
    .map((row) => {
      const recipient = Array.isArray(row.recipient) ? row.recipient[0] : row.recipient;
      return {
        id: row.id,
        recipient: recipient?.name ?? row.receiver,
        sender: row.sender,
        message: row.message,
        total: reactionTotals.get(row.id) ?? 0,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return {
    month,
    published: published.length,
    submitted: rows.length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    recipients: recipients.size,
    senders: senders.size,
    reactions: [...reactionTotals.values()].reduce((sum, value) => sum + value, 0),
    topRecipients: rank(recipients, 10),
    topSenders: rank(senders, 5),
    categories: rank(categories, 10),
    daily,
    topReacted,
    providers: rank(providers, 5),
  };
}
