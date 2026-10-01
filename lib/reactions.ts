import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ReactionCounts, ReactionKind } from "@/lib/types";

export type ReactionMap = Record<string, ReactionCounts>;

export const REACTION_EMOJI: Record<ReactionKind, string> = {
  clap: "👏",
  heart: "💜",
};

export async function fetchReactionCounts(
  supabase: SupabaseClient<Database>,
  recognitionIds: string[],
): Promise<ReactionMap> {
  if (recognitionIds.length === 0) return {};

  const { data, error } = await supabase
    .from("reaction_counts")
    .select("recognition_id, clap, heart")
    .in("recognition_id", recognitionIds);

  if (error || !data) return {};

  return Object.fromEntries(
    data.map((row) => [row.recognition_id, { clap: row.clap, heart: row.heart }]),
  );
}
