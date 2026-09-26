"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getMonthStartIso } from "@/lib/date";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapThanksRow, THANKS_WITH_RECIPIENT } from "@/lib/thanks-query";
import { MAX_VISIBLE_MESSAGES, type ThanksMessage } from "@/lib/types";

/** Realtime bağlantısı kopsa bile pano güncel kalsın diye yedek tazeleme aralığı. */
const REFRESH_INTERVAL_MS = 60_000;

type ThanksStream = {
  messages: ThanksMessage[];
  monthlyCount: number;
};

function prependMessage(
  current: ThanksMessage[],
  incoming: ThanksMessage,
): ThanksMessage[] {
  if (current.some((item) => item.id === incoming.id)) return current;

  return [incoming, ...current].slice(0, MAX_VISIBLE_MESSAGES);
}

export function useThanksStream(
  initialMessages: ThanksMessage[],
  initialMonthlyCount: number,
): ThanksStream {
  const [messages, setMessages] = useState<ThanksMessage[]>(initialMessages);
  const [monthlyCount, setMonthlyCount] = useState(initialMonthlyCount);
  const isMountedRef = useRef(true);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    const [list, monthly] = await Promise.all([
      supabase
        .from("thanks_messages")
        .select(THANKS_WITH_RECIPIENT)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(MAX_VISIBLE_MESSAGES),
      supabase
        .from("thanks_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("created_at", getMonthStartIso()),
    ]);

    if (!isMountedRef.current) return;

    if (!list.error && list.data) {
      setMessages(list.data.map((row) => mapThanksRow(row)));
    }
    if (!monthly.error && monthly.count !== null) setMonthlyCount(monthly.count);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    const channel: RealtimeChannel = supabase
      .channel("thanks-messages-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wall_signals" },
        (payload) => {
          if (!isMountedRef.current) return;

          const signal = payload.new as {
            recognition_id?: string;
            visible?: boolean;
          };
          if (!signal.recognition_id) return;

          if (!signal.visible) {
            const existing = messagesRef.current.find(
              (item) => item.id === signal.recognition_id,
            );
            if (existing && existing.created_at >= getMonthStartIso()) {
              setMonthlyCount((count) => Math.max(0, count - 1));
            }
            setMessages((current) =>
              current.filter((item) => item.id !== signal.recognition_id),
            );
            return;
          }

          void supabase
            .from("thanks_messages")
            .select(THANKS_WITH_RECIPIENT)
            .eq("id", signal.recognition_id)
            .eq("status", "approved")
            .maybeSingle()
            .then(({ data }) => {
              if (!data || !isMountedRef.current) return;

              const mapped = mapThanksRow(data);
              if (messagesRef.current.some((item) => item.id === mapped.id)) return;
              if (mapped.created_at >= getMonthStartIso()) {
                setMonthlyCount((count) => count + 1);
              }
              setMessages((current) => prependMessage(current, mapped));
            });
        },
      )
      .subscribe();

    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { messages, monthlyCount };
}
