"use client";

import { AnimatePresence } from "framer-motion";

import { RecognitionCard } from "@/components/wall/RecognitionCard";
import type { ReactionMap } from "@/lib/reactions";
import type { ThanksMessage } from "@/lib/types";

type RecognitionGridProps = {
  messages: ThanksMessage[];
  reactions: ReactionMap;
};

function EmptyState() {
  return (
    <div className="col-span-full row-span-full flex flex-col items-center justify-center gap-3 text-center">
      <span className="text-[clamp(32px,3vw,64px)]">💜</span>
      <p
        className="font-extrabold text-brand-950"
        style={{ fontSize: "clamp(20px, 1.6vw, 34px)" }}
      >
        Bu kategoride henüz teşekkür yok
      </p>
      <p
        className="max-w-xl text-ink-soft/70"
        style={{ fontSize: "clamp(14px, 1vw, 22px)" }}
      >
        İlkini sen bırak! Soldaki QR kodu telefonunla okutman yeterli.
      </p>
    </div>
  );
}

/**
 * Referans tasarımdaki 3 sütun x 2 satır yerleşimi. Üçten az mesaj kaldığında
 * alt satır boş kalmasın diye tek satıra düşer.
 */
export function RecognitionGrid({ messages, reactions }: RecognitionGridProps) {
  const rowCount = messages.length > 3 ? 2 : 1;

  return (
    <div
      className="grid h-full grid-cols-3 gap-[clamp(10px,1vw,22px)]"
      style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
    >
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((message, index) => (
            <RecognitionCard
              key={message.id}
              index={index}
              isTall={rowCount === 1}
              recipientName={message.recipient?.name ?? message.receiver}
              recipientAvatarUrl={message.recipient?.avatar_url ?? null}
              senderName={message.sender}
              message={message.message}
              category={message.category_tag}
              colorTheme={message.color_theme}
              reactions={reactions[message.id]}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
