"use client";

import { useEffect, useMemo, useState } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { fetchReactionCounts, type ReactionMap } from "@/lib/reactions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Görünen kartların tepki sayıları; realtime ile anında güncellenir. */
export function useReactionCounts(recognitionIds: string[]): ReactionMap {
  const [counts, setCounts] = useState<ReactionMap>({});
  const key = useMemo(() => [...recognitionIds].sort().join(","), [recognitionIds]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !key) return;

    let active = true;
    const supabase = getSupabaseBrowserClient();

    void fetchReactionCounts(supabase, key.split(",")).then((map) => {
      if (active) setCounts((current) => ({ ...current, ...map }));
    });

    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("reaction-counts-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reaction_counts" },
        (payload) => {
          const row = payload.new as {
            recognition_id?: string;
            clap?: number;
            heart?: number;
          };
          if (!row.recognition_id) return;

          setCounts((current) => ({
            ...current,
            [row.recognition_id!]: { clap: row.clap ?? 0, heart: row.heart ?? 0 },
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return counts;
}
