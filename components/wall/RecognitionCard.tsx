"use client";

import { motion } from "framer-motion";
import { Heart, Sparkles, Star, Sun, Users } from "lucide-react";

import { Avatar } from "@/components/wall/Avatar";
import {
  resolveDecoration,
  resolveTheme,
  type CardDecoration,
} from "@/lib/message-theme";
import { REACTION_EMOJI } from "@/lib/reactions";
import { toDativeCase } from "@/lib/turkish";
import { REACTION_KINDS, type ReactionCounts } from "@/lib/types";
import { cn } from "@/lib/utils";

export type RecognitionCardProps = {
  /** Süsleme çeşitliliği için kartın sayfadaki sırası. */
  index: number;
  /** Sayfada az kart varsa kartlar uzar; mesaj dikeyde ortalanır. */
  isTall?: boolean;
  recipientName: string;
  recipientAvatarUrl?: string | null;
  senderName: string;
  message: string;
  category: string;
  colorTheme: string;
  reactions?: ReactionCounts;
};

const DECORATION_ICONS: Record<CardDecoration, typeof Heart> = {
  heart: Heart,
  star: Star,
  sun: Sun,
  people: Users,
  sparkle: Sparkles,
};

/** Süslemeler referanstaki gibi kartın farklı köşelerinde durur. */
const DECORATION_POSITIONS: Record<CardDecoration, string> = {
  heart: "top-1/2 -translate-y-1/2",
  star: "top-1/2 -translate-y-1/2",
  sun: "top-[30%]",
  people: "bottom-[22%]",
  sparkle: "top-[18%]",
};

export function RecognitionCard({
  index,
  isTall = false,
  recipientName,
  recipientAvatarUrl,
  senderName,
  message,
  category,
  colorTheme,
  reactions,
}: RecognitionCardProps) {
  const reactionKinds = REACTION_KINDS.filter((kind) => (reactions?.[kind] ?? 0) > 0);
  const theme = resolveTheme(colorTheme);
  const decoration = resolveDecoration(index);
  const Decoration = DECORATION_ICONS[decoration];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 220, damping: 28, mass: 0.8 }}
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[24px] p-[clamp(15px,1.2vw,26px)] shadow-[0_16px_38px_-30px_rgba(35,19,67,0.85)]",
        theme.card,
      )}
    >
      <header className="flex shrink-0 items-center gap-[clamp(10px,0.85vw,18px)]">
        <Avatar
          name={recipientName}
          avatarUrl={recipientAvatarUrl}
          ringClassName={cn("ring-white", theme.ring)}
          className="size-[clamp(42px,3.4vw,68px)]"
        />
        <h3
          className="line-clamp-2 min-w-0 leading-tight font-extrabold text-brand-950"
          style={{ fontSize: "clamp(21px, 1.8vw, 40px)" }}
        >
          {toDativeCase(recipientName)}{" "}
          <span aria-hidden className="text-[0.8em]">
            💜
          </span>
        </h3>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden pt-[clamp(8px,0.7vw,16px)]",
          isTall ? "items-center" : "items-start",
        )}
      >
        <p
          className="clamp-lines max-h-full pr-[clamp(28px,2.6vw,56px)] leading-snug font-medium text-ink"
          style={{ fontSize: "clamp(15px, 1.3vw, 28px)" }}
        >
          {message}
        </p>
      </div>

      <footer className="mt-auto flex shrink-0 items-end justify-between gap-3 pt-[clamp(8px,0.7vw,16px)]">
        <span
          className={cn(
            "rounded-full px-[clamp(8px,0.7vw,16px)] py-[clamp(3px,0.3vw,7px)] font-bold",
            theme.pill,
          )}
          style={{ fontSize: "clamp(10px, 0.76vw, 16px)" }}
        >
          #{category}
        </span>
        <span className="flex min-w-0 items-center gap-[clamp(6px,0.6vw,14px)]">
          {reactionKinds.map((kind) => (
            <motion.span
              key={`${kind}-${reactions?.[kind]}`}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-white/70 px-[clamp(6px,0.5vw,12px)] py-[clamp(2px,0.2vw,5px)] font-bold text-brand-950 tabular-nums"
              style={{ fontSize: "clamp(10px, 0.8vw, 17px)" }}
            >
              {REACTION_EMOJI[kind]} {reactions?.[kind]}
            </motion.span>
          ))}
          <span
            className="truncate font-semibold text-ink-soft"
            style={{ fontSize: "clamp(11px, 0.85vw, 18px)" }}
          >
            — {senderName}
          </span>
        </span>
      </footer>

      <Decoration
        aria-hidden
        strokeWidth={2.2}
        className={cn(
          "pointer-events-none absolute right-[clamp(10px,0.9vw,20px)] size-[clamp(22px,2.1vw,44px)]",
          DECORATION_POSITIONS[decoration],
          theme.accent,
        )}
      />
    </motion.article>
  );
}
