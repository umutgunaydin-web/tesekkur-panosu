"use client";

import { useEffect, useState } from "react";

type WallHeaderProps = {
  monthlyCount: number;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });
const TIME_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Saat yalnızca istemcide üretilir; sunucu/istemci farkı hydration'ı bozmasın. */
function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 20_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return now;
}

function HandDrawnHeart() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 56"
      fill="none"
      className="h-[1.05em] w-[1.05em] shrink-0"
    >
      <path
        d="M32 51C32 51 6 35.5 6 20.5C6 11.5 12.5 5.5 20 5.5C25.5 5.5 29.5 8.5 32 13C34.5 8.5 38.5 5.5 44 5.5C51.5 5.5 58 11.5 58 20.5C58 35.5 32 51 32 51Z"
        stroke="#FBC93D"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccentStrokes() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 48"
      fill="none"
      strokeLinecap="round"
      className="h-[0.8em] w-[0.5em] shrink-0"
    >
      <path d="M6 10 L20 4" stroke="#7C3AED" strokeWidth={5} />
      <path d="M8 24 L26 24" stroke="#7C3AED" strokeWidth={5} />
      <path d="M6 38 L20 44" stroke="#7C3AED" strokeWidth={5} />
    </svg>
  );
}

export function WallHeader({ monthlyCount }: WallHeaderProps) {
  const now = useClock();

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[clamp(16px,1.6vw,36px)]">
      <div className="pt-[clamp(4px,0.5vw,10px)] text-center">
        <h1
          className="flex items-center justify-center gap-[clamp(8px,0.7vw,16px)] font-hand leading-none font-bold text-brand-950"
          style={{ fontSize: "clamp(44px, 4.7vw, 96px)" }}
        >
          Bir Teşekkür Bırak
          <span className="flex items-center gap-[0.12em]">
            <HandDrawnHeart />
            <AccentStrokes />
          </span>
        </h1>

        <p
          className="mt-[clamp(6px,0.6vw,14px)] font-bold text-ink"
          style={{ fontSize: "clamp(16px, 1.25vw, 26px)" }}
        >
          Bugün kimin gününü güzelleştirdiğini söyle.
        </p>
        <p
          className="mt-[clamp(2px,0.25vw,6px)] font-medium text-ink-soft/70"
          style={{ fontSize: "clamp(11px, 0.78vw, 16px)" }}
        >
          Küçük bir teşekkür, büyük bir ekip yaratır. 💜
        </p>
      </div>

      <div className="w-[clamp(240px,19vw,360px)]">
        <div className="relative flex items-start justify-between gap-3 overflow-hidden rounded-[10px_34px_34px_34px] bg-brand-100/90 px-[clamp(12px,1vw,20px)] py-[clamp(10px,0.9vw,18px)]">
          <p
            className="font-hand leading-[1.1] font-semibold text-brand-950"
            style={{ fontSize: "clamp(17px, 1.35vw, 28px)" }}
          >
            İyi insanlar,
            <br />
            harika işler
            <br />
            başarır. ♡
          </p>

          <div className="text-right">
            <p
              className="font-semibold text-ink-soft"
              style={{ fontSize: "clamp(10px, 0.7vw, 15px)" }}
            >
              {now ? DATE_FORMATTER.format(now) : "\u00A0"}
            </p>
            <p
              className="text-ink-soft/70"
              style={{ fontSize: "clamp(10px, 0.7vw, 15px)" }}
            >
              {now ? WEEKDAY_FORMATTER.format(now) : "\u00A0"}
            </p>
            <p
              className="mt-[0.15em] font-extrabold text-brand-950"
              style={{ fontSize: "clamp(22px, 1.8vw, 38px)" }}
            >
              {now ? TIME_FORMATTER.format(now) : "--:--"}
            </p>
          </div>
        </div>

        <div className="mt-[clamp(8px,0.7vw,14px)] flex items-center justify-between gap-3 rounded-2xl bg-white px-[clamp(12px,1vw,20px)] py-[clamp(8px,0.65vw,14px)] shadow-[0_14px_34px_-28px_rgba(35,19,67,0.9)]">
          <span
            className="font-semibold text-ink-soft"
            style={{ fontSize: "clamp(10px, 0.72vw, 15px)" }}
          >
            Bu ay paylaşılan teşekkür sayısı
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              className="h-[clamp(16px,1.15vw,24px)] w-[clamp(16px,1.15vw,24px)]"
            >
              <path
                d="M12 20.5S3.5 14.9 3.5 9.4C3.5 6.2 6 4 8.6 4c1.9 0 3.1 1 3.4 1.9C12.3 5 13.5 4 15.4 4 18 4 20.5 6.2 20.5 9.4c0 5.5-8.5 11.1-8.5 11.1Z"
                stroke="#EC4899"
                strokeWidth={2.2}
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="font-extrabold text-brand-950"
              style={{ fontSize: "clamp(18px, 1.45vw, 30px)" }}
            >
              {monthlyCount}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
