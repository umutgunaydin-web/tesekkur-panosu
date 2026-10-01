"use client";

import { useEffect, useState, useTransition } from "react";

import { toggleReaction } from "@/app/pano/actions";
import { Avatar } from "@/components/wall/Avatar";
import { useReactionCounts } from "@/hooks/use-reaction-counts";
import { REACTION_EMOJI, type ReactionMap } from "@/lib/reactions";
import { toDativeCase } from "@/lib/turkish";
import { REACTION_KINDS, type ReactionKind, type ThanksMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEVICE_KEY = "tesekkur-panosu:device";
const REACTED_KEY = "tesekkur-panosu:reacted";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Gizli sekmede depolama yoksa tepki yine kaydedilir, yalnız işaret hatırlanmaz.
  }
}

function getDeviceId(): string {
  const stored = readStorage(DEVICE_KEY);
  if (stored) return stored;

  const created = crypto.randomUUID();
  writeStorage(DEVICE_KEY, created);
  return created;
}

export function ReactionFeed({
  messages,
  initialCounts,
}: {
  messages: ThanksMessage[];
  initialCounts: ReactionMap;
}) {
  const live = useReactionCounts(messages.map((message) => message.id));
  const [local, setLocal] = useState<ReactionMap>({});
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    try {
      setReacted(new Set(JSON.parse(readStorage(REACTED_KEY) ?? "[]") as string[]));
    } catch {
      setReacted(new Set());
    }
  }, []);

  // Başkasının tepkisi realtime ile gelince yerel düzeltmeyi bırak, canlı sayıya dön.
  useEffect(() => {
    setLocal((current) => {
      const next = { ...current };
      for (const id of Object.keys(live)) delete next[id];
      return next;
    });
  }, [live]);

  const countsFor = (id: string) =>
    local[id] ?? live[id] ?? initialCounts[id] ?? { clap: 0, heart: 0 };

  const react = (id: string, kind: ReactionKind) => {
    const key = `${id}:${kind}`;
    const wasActive = reacted.has(key);
    const before = countsFor(id);

    // İyimser güncelleme: dokunuş anında görünür, sunucu cevabıyla düzeltilir.
    setLocal((current) => ({
      ...current,
      [id]: { ...before, [kind]: Math.max(0, before[kind] + (wasActive ? -1 : 1)) },
    }));
    setError(null);

    startTransition(async () => {
      const result = await toggleReaction({ recognitionId: id, kind, deviceId: getDeviceId() });

      if (result.status === "error") {
        setLocal((current) => ({ ...current, [id]: before }));
        setError(result.message);
        return;
      }

      setLocal((current) => ({ ...current, [id]: result.counts }));
      setReacted((current) => {
        const next = new Set(current);
        if (result.active) next.add(key);
        else next.delete(key);
        writeStorage(REACTED_KEY, JSON.stringify([...next]));
        return next;
      });
    });
  };

  if (messages.length === 0) {
    return (
      <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">
        Panoda henüz teşekkür yok. İlkini sen bırak!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>
      ) : null}
      {messages.map((message) => {
        const counts = countsFor(message.id);
        const name = message.recipient?.name ?? message.receiver;

        return (
          <article key={message.id} className="rounded-3xl bg-white p-5 shadow-sm">
            <header className="flex items-center gap-3">
              <Avatar
                name={name}
                avatarUrl={message.recipient?.avatar_url ?? null}
                className="size-11 text-sm"
              />
              <div className="min-w-0">
                <h2 className="font-extrabold leading-tight text-brand-950">
                  {toDativeCase(name)}
                </h2>
                <p className="text-xs text-slate-500">
                  {message.sender} · #{message.category_tag}
                </p>
              </div>
            </header>
            <p className="mt-3 text-[15px] leading-snug text-ink">{message.message}</p>
            <div className="mt-4 flex gap-2">
              {REACTION_KINDS.map((kind) => {
                const active = reacted.has(`${message.id}:${kind}`);

                return (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={active}
                    onClick={() => react(message.id, kind)}
                    className={cn(
                      "flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-bold tabular-nums transition-colors",
                      active
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-violet-200 bg-white text-violet-900",
                    )}
                  >
                    <span aria-hidden>{REACTION_EMOJI[kind]}</span>
                    {counts[kind]}
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
