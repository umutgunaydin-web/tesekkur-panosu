"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { Avatar } from "@/components/wall/Avatar";
import { hasDeliberateRemoval, sameOrder, schedulePinned } from "@/lib/culture/strip";
import { REACTION_EMOJI, type ReactionMap } from "@/lib/reactions";
import { toDativeCase } from "@/lib/turkish";
import { REACTION_KINDS, type ThanksMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Kart başına akış süresi; tur süresi kart sayısıyla orantılıdır. */
const SECONDS_PER_CARD = 7;

/** Bu sayının altında kartlar ekrana sığar; akıtmak yerine sabit durur. */
const MIN_CARDS_TO_SCROLL = 4;

const CARD_TONES = [
  "bg-[#fde7ef]",
  "bg-[#e3f5ea]",
  "bg-[#e6ecff]",
  "bg-[#fff4d6]",
  "bg-[#efe7ff]",
];

/** Kartın rengi kimliğinden gelir; liste değişse de aynı kart aynı renkte kalır. */
function toneOf(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CARD_TONES[hash % CARD_TONES.length];
}

function StripCard({
  message,
  reactions,
  isNew = false,
}: {
  message: ThanksMessage;
  reactions?: { clap: number; heart: number };
  isNew?: boolean;
}) {
  const name = message.recipient?.name ?? message.receiver;
  const kinds = REACTION_KINDS.filter((kind) => (reactions?.[kind] ?? 0) > 0);

  return (
    <article
      className={cn(
        "relative rounded-[22px] p-[clamp(14px,1vw,22px)]",
        toneOf(message.id),
        isNew && "ring-[3px] ring-sun shadow-[0_18px_40px_-24px_rgba(226,90,78,0.9)]",
      )}
    >
      {isNew ? (
        <span
          className="absolute -top-2.5 right-4 rounded-full bg-sun px-2.5 py-0.5 font-extrabold tracking-[0.12em] text-white uppercase"
          style={{ fontSize: "clamp(10px, 0.7vw, 15px)" }}
        >
          Yeni
        </span>
      ) : null}
      <header className="flex items-center gap-[clamp(8px,0.6vw,14px)]">
        <Avatar
          name={name}
          avatarUrl={message.recipient?.avatar_url ?? null}
          ringClassName="ring-white"
          className="size-[clamp(36px,2.4vw,52px)] shrink-0"
        />
        <h3
          className="line-clamp-2 leading-tight font-extrabold text-brand-950"
          style={{ fontSize: "clamp(16px, 1.15vw, 26px)" }}
        >
          {toDativeCase(name)} 💜
        </h3>
      </header>
      <p
        className="mt-[clamp(8px,0.6vw,14px)] leading-snug font-medium text-ink"
        style={{ fontSize: "clamp(14px, 0.98vw, 22px)" }}
      >
        {message.message}
      </p>
      <footer
        className="mt-[clamp(8px,0.6vw,14px)] flex items-center justify-between gap-2 text-ink-soft"
        style={{ fontSize: "clamp(11px, 0.75vw, 16px)" }}
      >
        <span className="font-bold">#{message.category_tag}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          {kinds.map((kind) => (
            <span key={kind} className="rounded-full bg-white/70 px-2 py-0.5 font-bold text-brand-950">
              {REACTION_EMOJI[kind]} {reactions?.[kind]}
            </span>
          ))}
          <span className="truncate font-semibold">— {message.sender}</span>
        </span>
      </footer>
    </article>
  );
}

export function ThanksStrip({
  messages,
  reactions,
  submitUrl,
}: {
  messages: ThanksMessage[];
  reactions: ReactionMap;
  submitUrl: string;
}) {
  // Oturum açıldıktan sonra gelen mesajların geliş anı; "Yeni" süresi buradan sayılır.
  const knownIds = useRef<Set<string> | null>(null);
  const [arrivals, setArrivals] = useState<Map<string, number>>(() => new Map());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!knownIds.current) {
      knownIds.current = new Set(messages.map((message) => message.id));
      return;
    }
    const fresh = messages.filter((message) => !knownIds.current!.has(message.id));
    if (fresh.length === 0) return;
    const arrivedAt = Date.now();
    for (const message of fresh) knownIds.current.add(message.id);
    setArrivals((current) => {
      const next = new Map(current);
      for (const message of fresh) next.set(message.id, arrivedAt);
      return next;
    });
    setNow(arrivedAt);
  }, [messages]);

  useEffect(() => {
    // Sabit alan 1 dakikada bir el değiştirir; birkaç saniyelik gecikme yeterli.
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const { pinned, flow: target } = useMemo(
    () => schedulePinned(messages, arrivals, now),
    [messages, arrivals, now],
  );

  // Akış listesi yalnız tur başa sararken güncellenir; böylece şerit zıplamaz.
  // Yönetici kaldırması beklemeden uygulanır.
  const [flow, setFlow] = useState(target);
  const [loopKey, setLoopKey] = useState(0);
  const pending = useRef(target);
  pending.current = target;

  const shouldScroll = flow.length >= MIN_CARDS_TO_SCROLL;

  useEffect(() => {
    if (sameOrder(flow, target)) return;
    if (!shouldScroll || target.length < MIN_CARDS_TO_SCROLL || hasDeliberateRemoval(flow, target)) {
      setFlow(target);
      setLoopKey((key) => key + 1);
    }
  }, [flow, target, shouldScroll]);

  const applyPendingAtLoopEnd = () => {
    if (sameOrder(flow, pending.current)) return;
    setFlow(pending.current);
    setLoopKey((key) => key + 1);
  };

  // Dikişsiz döngü için liste iki kez çizilir; animasyon yarım yükseklik kadar kayar.
  const loop = shouldScroll ? [...flow, ...flow] : [...flow].reverse();

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-white/65">
      <header className="flex items-center gap-[clamp(10px,0.8vw,18px)] border-b border-brand-100 bg-white p-[clamp(12px,1vw,22px)]">
        <div className="min-w-0 flex-1">
          <h2
            className="font-hand leading-none font-bold text-brand-950"
            style={{ fontSize: "clamp(34px, 2.7vw, 60px)" }}
          >
            Teşekkürler
          </h2>
          <p
            className="mt-[clamp(4px,0.4vw,8px)] leading-tight font-semibold text-ink-soft"
            style={{ fontSize: "clamp(12px, 0.85vw, 18px)" }}
          >
            QR&apos;ı okut,
            <br />
            sen de bırak 💜
          </p>
        </div>
        {/* TV'de 1,5-2 metreden okutulabilecek boyut (55" ekranda ~9 cm). */}
        <div className="shrink-0 rounded-2xl border-[3px] border-brand-100 bg-white p-[clamp(5px,0.4vw,9px)]">
          <QRCodeSVG
            value={submitUrl}
            level="M"
            fgColor="#101A36"
            style={{ width: "clamp(96px, 7.8vw, 180px)", height: "auto" }}
            size={200}
          />
        </div>
      </header>
      {pinned ? (
        <div className="shrink-0 px-[clamp(12px,0.9vw,20px)] pt-[clamp(14px,1vw,22px)] pb-[clamp(4px,0.4vw,8px)]">
          {/* CSS animasyonu: çalışmasa bile kart son hâlinde, yani görünür kalır. */}
          <div key={pinned.id} className="culture-motion animate-[culture-pin-in_700ms_ease-out_both]">
            <StripCard message={pinned} reactions={reactions[pinned.id]} isNew />
          </div>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden px-[clamp(12px,0.9vw,20px)]">
        {messages.length === 0 ? (
          <p className="pt-10 text-center font-semibold text-ink-soft">
            İlk teşekkürü sen bırak!
          </p>
        ) : (
          <div
            key={loopKey}
            className="culture-motion flex flex-col gap-[clamp(10px,0.8vw,18px)] py-[clamp(10px,0.8vw,18px)]"
            onAnimationIteration={applyPendingAtLoopEnd}
            style={
              shouldScroll
                ? {
                    animation: `culture-strip-down ${flow.length * SECONDS_PER_CARD}s linear infinite`,
                  }
                : undefined
            }
          >
            {loop.map((message, index) => (
              <StripCard
                key={`${message.id}-${index}`}
                message={message}
                reactions={reactions[message.id]}
              />
            ))}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#F5F7FB] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#F5F7FB] to-transparent" />
      </div>
    </aside>
  );
}
