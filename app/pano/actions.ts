"use server";

import { z } from "zod";

import { getClientHash } from "@/lib/client-hash";
import { minutesAgoIso, REACTION_LIMIT } from "@/lib/limits";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { REACTION_KINDS, type ReactionCounts } from "@/lib/types";

const inputSchema = z.object({
  recognitionId: z.string().uuid(),
  kind: z.enum(REACTION_KINDS),
  deviceId: z.string().min(8).max(64),
});

export type ToggleReactionResult =
  | { status: "success"; active: boolean; counts: ReactionCounts }
  | { status: "error"; message: string };

/** Aynı cihaz aynı tepkiye ikinci kez basarsa tepki geri alınır. */
export async function toggleReaction(input: {
  recognitionId: string;
  kind: string;
  deviceId: string;
}): Promise<ToggleReactionResult> {
  const parsed = inputSchema.safeParse(input);
  const admin = getSupabaseAdminClient();

  if (!parsed.success || !admin) {
    return { status: "error", message: "Tepki kaydedilemedi." };
  }

  const { recognitionId, kind, deviceId } = parsed.data;

  const { data: recognition } = await admin
    .from("thanks_messages")
    .select("id")
    .eq("id", recognitionId)
    .eq("status", "approved")
    .maybeSingle();

  if (!recognition) {
    return { status: "error", message: "Bu mesaj artık panoda değil." };
  }

  const { data: existing } = await admin
    .from("recognition_reactions")
    .select("recognition_id")
    .eq("recognition_id", recognitionId)
    .eq("device_id", deviceId)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    await admin
      .from("recognition_reactions")
      .delete()
      .eq("recognition_id", recognitionId)
      .eq("device_id", deviceId)
      .eq("kind", kind);
  } else {
    const clientHash = await getClientHash();

    if (clientHash) {
      const { count } = await admin
        .from("recognition_reactions")
        .select("recognition_id", { count: "exact", head: true })
        .eq("client_hash", clientHash)
        .gte("created_at", minutesAgoIso(REACTION_LIMIT.windowMinutes));

      if ((count ?? 0) >= REACTION_LIMIT.max) {
        return { status: "error", message: "Çok hızlı tepki veriliyor, biraz bekle." };
      }
    }

    const { error } = await admin.from("recognition_reactions").insert({
      recognition_id: recognitionId,
      device_id: deviceId,
      kind,
      client_hash: clientHash,
    });

    // Çift dokunuşta birincil anahtar çakışması: tepki zaten var.
    if (error && error.code !== "23505") {
      return { status: "error", message: "Tepki kaydedilemedi." };
    }
  }

  const { data: counts } = await admin
    .from("reaction_counts")
    .select("clap, heart")
    .eq("recognition_id", recognitionId)
    .maybeSingle();

  return {
    status: "success",
    active: !existing,
    counts: { clap: counts?.clap ?? 0, heart: counts?.heart ?? 0 },
  };
}
